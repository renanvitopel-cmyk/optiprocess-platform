import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { NotFoundError, ForbiddenError, ValidationError } from "../../utils/errors";
import { clientScopeFilter, assertServiceAccess } from "../../middleware/rbac";
import { writeAuditLog } from "../../utils/audit";

export const listCostCenters = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const { clientId, active } = req.query as { clientId?: string; active?: string };
  const costCenters = await prisma.costCenter.findMany({
    where: {
      deletedAt: null,
      ...clientScopeFilter(req),
      ...(clientId ? { clientId } : {}),
      ...(active !== undefined ? { active: active === "true" } : {}),
    },
    orderBy: { name: "asc" },
  });
  res.json(costCenters);
});

const costCenterSchema = z.object({
  clientId: z.string().uuid().optional(),
  name: z.string().min(2, "Informe o nome do centro de custo."),
  code: z.string().nullish(),
});

export const createCostCenter = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = costCenterSchema.parse(req.body);
  if (req.user?.role === "CLIENT") {
    if (!req.user.clientId) throw new ForbiddenError();
    data.clientId = req.user.clientId;
  } else if (!data.clientId) {
    throw new ValidationError("Selecione o cliente.");
  }

  const existing = await prisma.costCenter.findFirst({
    where: { clientId: data.clientId, name: { equals: data.name, mode: "insensitive" } },
  });
  if (existing) {
    // Registro inativo OU removido volta a valer com o mesmo nome. O removido
    // some da lista mas continua no banco (exclusao logica, para nao perder
    // historico); sem este ramo, cadastrar de novo dizia "ja existe" sobre algo
    // que a tela nao mostra - e nao havia como sair desse impasse.
    if (!existing.active || existing.deletedAt) {
      const reactivated = await prisma.costCenter.update({
        where: { id: existing.id },
        data: { active: true, deletedAt: null },
      });
      return res.status(200).json(reactivated);
    }
    throw new ValidationError(`O centro de custo "${data.name}" ja existe.`);
  }

  const costCenter = await prisma.costCenter.create({ data: { ...data, clientId: data.clientId! } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "CREATE",
    entityType: "CostCenter",
    entityId: costCenter.id,
    description: `Centro de custo "${costCenter.name}" cadastrado`,
  });

  return res.status(201).json(costCenter);
});

const updateSchema = costCenterSchema.partial().extend({ active: z.boolean().optional() });

export const updateCostCenter = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = updateSchema.parse(req.body);
  const existing = await prisma.costCenter.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Centro de custo");
  if (req.user?.role === "CLIENT") {
    if (existing.clientId !== req.user.clientId) throw new ForbiddenError();
    delete data.clientId;
  }

  const costCenter = await prisma.costCenter.update({ where: { id: existing.id }, data });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "CostCenter",
    entityId: costCenter.id,
    description: `Centro de custo "${costCenter.name}" atualizado`,
  });

  res.json(costCenter);
});

export const deleteCostCenter = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.costCenter.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Centro de custo");
  if (req.user?.role === "CLIENT" && existing.clientId !== req.user.clientId) throw new ForbiddenError();

  await prisma.costCenter.update({ where: { id: existing.id }, data: { deletedAt: new Date(), active: false } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "DELETE",
    entityType: "CostCenter",
    entityId: existing.id,
    description: `Centro de custo "${existing.name}" removido`,
  });

  res.status(204).send();
});
