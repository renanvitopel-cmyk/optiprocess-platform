import type { Request, Response } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parsePageParams, toSkipTake, buildPagedResult } from "../../utils/pagination";
import { hashPassword, generateTemporaryPassword } from "../../lib/password";
import { ForbiddenError, NotFoundError, ValidationError } from "../../utils/errors";
import { writeAuditLog } from "../../utils/audit";
import { assertUserLimitNotExceeded } from "../../lib/planLimits";

/** Perfis que pertencem a uma empresa e por isso exigem clientId. */
const PERFIS_DE_CLIENTE: Role[] = ["CLIENT", "REQUESTER"];

/**
 * O gestor da empresa administra o acesso da propria equipe - e nada alem disso.
 *
 * Antes so a OptiProcess criava usuario, e a tela do cliente dizia "fale com a
 * OptiProcess" para cada pessoa nova. Abrir isso exige tres cercas, todas aqui:
 * so a propria empresa, so os perfis do portal, e nunca contra si mesmo.
 */
function ehGestorDeCliente(req: Request): boolean {
  return req.user?.role === "CLIENT";
}

/** Perfis que um gestor de cliente pode criar ou atribuir. */
const PERFIS_QUE_O_GESTOR_CRIA: Role[] = ["CLIENT", "REQUESTER"];

function assertGestorPodeMexer(req: Request, alvo: { id: string; clientId: string | null; role: Role }) {
  if (!ehGestorDeCliente(req)) return;
  if (!req.user?.clientId || alvo.clientId !== req.user.clientId) {
    throw new ForbiddenError("Voce so administra os acessos da sua propria empresa.");
  }
  if (!PERFIS_QUE_O_GESTOR_CRIA.includes(alvo.role)) {
    throw new ForbiddenError("Este acesso e' da equipe OptiProcess e nao pode ser alterado por aqui.");
  }
  if (alvo.id === req.user.sub) {
    // Rebaixar ou desativar o proprio acesso tranca a empresa para fora do portal, e
    // ninguem la dentro consegue desfazer.
    throw new ValidationError("Voce nao pode alterar o proprio acesso por aqui. Use Meu perfil.");
  }
}

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  clientId: true,
  active: true,
  lastLoginAt: true,
  createdAt: true,
  client: { select: { id: true, companyName: true, tradeName: true } },
} as const;

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const pageParams = parsePageParams(req.query as Record<string, unknown>);
  const { role, active, search } = req.query as { role?: Role; active?: string; search?: string };

  const where = {
    deletedAt: null,
    // O gestor enxerga a propria equipe; a OptiProcess enxerga todos.
    ...(ehGestorDeCliente(req) ? { clientId: req.user?.clientId ?? "" } : {}),
    ...(role ? { role } : {}),
    ...(active !== undefined ? { active: active === "true" } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({ where, select: userSelect, orderBy: { name: "asc" }, ...toSkipTake(pageParams) }),
    prisma.user.count({ where }),
  ]);

  res.json(buildPagedResult(items, total, pageParams));
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findFirst({
    where: { id: req.params.id, deletedAt: null, ...(ehGestorDeCliente(req) ? { clientId: req.user?.clientId ?? "" } : {}) },
    select: userSelect,
  });
  if (!user) throw new NotFoundError("Usuario");
  res.json(user);
});

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
  role: z.nativeEnum(Role),
  clientId: z.string().uuid().nullish(),
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const data = createUserSchema.parse(req.body);

  if (ehGestorDeCliente(req)) {
    if (!req.user?.clientId) throw new ForbiddenError();
    // O gestor nao escolhe a empresa nem cria perfil da OptiProcess: a empresa e' sempre a
    // dele, e o perfil so pode ser um dos dois que existem no portal.
    data.clientId = req.user.clientId;
    if (!PERFIS_QUE_O_GESTOR_CRIA.includes(data.role)) {
      throw new ForbiddenError("Voce pode criar apenas acessos de Gestor ou de Solicitante.");
    }
  }

  // CLIENT e REQUESTER sao perfis de uma empresa: sem clientId eles nao alcancam dado
  // nenhum (o escopo por empresa e' o que define o que enxergam) - e ficavam com o portal
  // vazio, sem explicacao.
  if (PERFIS_DE_CLIENTE.includes(data.role) && !data.clientId) {
    throw new ValidationError("Usuarios do tipo Cliente precisam estar vinculados a uma empresa.");
  }
  // Solicitante nao ocupa vaga: o limite so vale para os acessos contratados.
  if (data.role === "CLIENT" && data.clientId) await assertUserLimitNotExceeded(data.clientId);

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash,
      role: data.role,
      clientId: PERFIS_DE_CLIENTE.includes(data.role) ? data.clientId : null,
    },
    select: userSelect,
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "CREATE",
    entityType: "User",
    entityId: user.id,
    description: `Usuario ${user.name} criado`,
  });

  res.status(201).json(user);
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.nativeEnum(Role).optional(),
  clientId: z.string().uuid().nullish(),
  active: z.boolean().optional(),
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const data = updateUserSchema.parse(req.body);
  const existing = await prisma.user.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Usuario");
  assertGestorPodeMexer(req, existing);
  if (ehGestorDeCliente(req)) {
    delete data.clientId; // nunca transfere alguem para outra empresa
    if (data.role && !PERFIS_QUE_O_GESTOR_CRIA.includes(data.role)) {
      throw new ForbiddenError("Voce pode atribuir apenas os perfis Gestor ou Solicitante.");
    }
  }

  // So conta contra o limite do plano quando o usuario esta passando a ocupar uma vaga
  // nova naquele cliente (role virando CLIENT, ou mudando de empresa) - reativar
  // (active:true) um usuario que ja pertencia ao cliente nao e' uma vaga nova.
  const ehPerfilDeCliente = PERFIS_DE_CLIENTE.includes(data.role ?? existing.role) || PERFIS_DE_CLIENTE.includes(existing.role);
  const nextClientId = ehPerfilDeCliente ? (data.clientId !== undefined ? data.clientId : existing.clientId) : null;
  const clientChanged = nextClientId && nextClientId !== existing.clientId;
  if (clientChanged) await assertUserLimitNotExceeded(nextClientId);

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      name: data.name,
      role: data.role,
      active: data.active,
      clientId: ehPerfilDeCliente ? data.clientId : undefined,
    },
    select: userSelect,
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "User",
    entityId: user.id,
    description: `Usuario ${user.name} atualizado`,
  });

  res.json(user);
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.user.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Usuario");
  assertGestorPodeMexer(req, existing);

  await prisma.user.update({ where: { id: req.params.id }, data: { deletedAt: new Date(), active: false } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "DELETE",
    entityType: "User",
    entityId: existing.id,
    description: `Usuario ${existing.name} desativado/excluido`,
  });

  res.status(204).send();
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.user.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Usuario");
  assertGestorPodeMexer(req, existing);

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "User",
    entityId: existing.id,
    description: "Senha redefinida pelo administrador",
  });

  // Sem servico de e-mail: a senha temporaria e devolvida uma unica vez para o
  // administrador repassar ao usuario pelo canal que preferir (WhatsApp, etc).
  res.json({ temporaryPassword });
});

const setPasswordSchema = z.object({
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
});

/** Administrador define diretamente a senha de um usuario (sem precisar da atual). */
export const setUserPassword = asyncHandler(async (req: Request, res: Response) => {
  const { password } = setPasswordSchema.parse(req.body);
  const existing = await prisma.user.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Usuario");
  assertGestorPodeMexer(req, existing);

  await prisma.user.update({
    where: { id: existing.id },
    data: { passwordHash: await hashPassword(password) },
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "User",
    entityId: existing.id,
    description: `Senha de ${existing.name} definida pelo administrador`,
  });

  res.status(204).send();
});

export const listRoleDefinitions = asyncHandler(async (_req: Request, res: Response) => {
  const roles = await prisma.roleDefinition.findMany({
    include: { permissions: { include: { permission: true } } },
    orderBy: { label: "asc" },
  });

  res.json(
    roles.map((r) => ({
      key: r.key,
      label: r.label,
      description: r.description,
      permissions: r.permissions.map((rp) => rp.permission.label),
    })),
  );
});
