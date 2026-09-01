import type { Request, Response } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parsePageParams, toSkipTake, buildPagedResult } from "../../utils/pagination";
import { hashPassword, generateTemporaryPassword } from "../../lib/password";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { writeAuditLog } from "../../utils/audit";

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
  const user = await prisma.user.findFirst({ where: { id: req.params.id, deletedAt: null }, select: userSelect });
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

  if (data.role === "CLIENT" && !data.clientId) {
    throw new ValidationError("Usuarios do tipo Cliente precisam estar vinculados a uma empresa.");
  }

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash,
      role: data.role,
      clientId: data.role === "CLIENT" ? data.clientId : null,
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

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      name: data.name,
      role: data.role,
      active: data.active,
      clientId: data.role === "CLIENT" || existing.role === "CLIENT" ? data.clientId : undefined,
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
