import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { NotFoundError, ForbiddenError, ValidationError } from "../../utils/errors";
import { clientScopeFilter, assertServiceAccess } from "../../middleware/rbac";
import { writeAuditLog } from "../../utils/audit";

export const listAssetSystems = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const { clientId, areaId, active } = req.query as { clientId?: string; areaId?: string; active?: string };
  const systems = await prisma.assetSystem.findMany({
    where: {
      deletedAt: null,
      ...clientScopeFilter(req),
      ...(clientId ? { clientId } : {}),
      ...(areaId ? { areaId } : {}),
      ...(active !== undefined ? { active: active === "true" } : {}),
    },
    include: { area: { select: { id: true, name: true, plant: { select: { id: true, name: true } } } } },
    orderBy: { name: "asc" },
  });
  res.json(systems);
});

const systemSchema = z.object({
  clientId: z.string().uuid().optional(),
  areaId: z.string().uuid("Selecione a area."),
  name: z.string().min(2, "Informe o nome do sistema."),
  code: z.string().nullish(),
});

/** A area escolhida precisa existir e ser da mesma empresa. */
async function assertAreaBelongsToClient(areaId: string, clientId: string): Promise<void> {
  const area = await prisma.area.findFirst({ where: { id: areaId, deletedAt: null } });
  if (!area) throw new NotFoundError("Area");
  if (area.clientId !== clientId) throw new ValidationError("A area selecionada e' de outra empresa.");
}

export const createAssetSystem = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = systemSchema.parse(req.body);
  if (req.user?.role === "CLIENT") {
    if (!req.user.clientId) throw new ForbiddenError();
    data.clientId = req.user.clientId;
  } else if (!data.clientId) {
    throw new ValidationError("Selecione o cliente.");
  }
  await assertAreaBelongsToClient(data.areaId, data.clientId!);

  const existing = await prisma.assetSystem.findFirst({
    where: { areaId: data.areaId, name: { equals: data.name, mode: "insensitive" } },
  });
  if (existing) {
    // Registro inativo OU removido volta a valer com o mesmo nome, JA COM OS DADOS QUE
    // acabaram de ser informados. Reviver mantendo os valores antigos era pior que o
    // impasse que isso resolveu: o usuario preenchia o formulario, salvava sem erro, e o
    // registro voltava como estava antes - o centro de custo escolhido simplesmente
    // desaparecia, sem nada na tela explicando.
    if (!existing.active || existing.deletedAt) {
      const reactivated = await prisma.assetSystem.update({
        where: { id: existing.id },
        data: { ...data, clientId: undefined, active: true, deletedAt: null },
      });
      return res.status(200).json(reactivated);
    }
    throw new ValidationError(`O sistema "${data.name}" ja existe nesta area.`);
  }

  const system = await prisma.assetSystem.create({ data: { ...data, clientId: data.clientId! } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "CREATE",
    entityType: "AssetSystem",
    entityId: system.id,
    description: `Sistema "${system.name}" cadastrado`,
  });

  return res.status(201).json(system);
});

const updateSchema = systemSchema.partial().extend({ active: z.boolean().optional() });

export const updateAssetSystem = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = updateSchema.parse(req.body);
  const existing = await prisma.assetSystem.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Sistema");
  if (req.user?.role === "CLIENT") {
    if (existing.clientId !== req.user.clientId) throw new ForbiddenError();
    delete data.clientId;
  }
  if (data.areaId) await assertAreaBelongsToClient(data.areaId, data.clientId ?? existing.clientId);

  const system = await prisma.assetSystem.update({ where: { id: existing.id }, data });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "AssetSystem",
    entityId: system.id,
    description: `Sistema "${system.name}" atualizado`,
  });

  res.json(system);
});

export const deleteAssetSystem = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.assetSystem.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Sistema");
  if (req.user?.role === "CLIENT" && existing.clientId !== req.user.clientId) throw new ForbiddenError();

  await prisma.assetSystem.update({ where: { id: existing.id }, data: { deletedAt: new Date(), active: false } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "DELETE",
    entityType: "AssetSystem",
    entityId: existing.id,
    description: `Sistema "${existing.name}" removido`,
  });

  res.status(204).send();
});
