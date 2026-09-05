import type { Request, Response } from "express";
import { z } from "zod";
import { MaintenancePriority } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { NotFoundError, ForbiddenError, ValidationError } from "../../utils/errors";
import { assertServiceAccess } from "../../middleware/rbac";

/** Um cliente enxerga o catalogo padrao da OptiProcess (clientId nulo) somado aos codigos
 * que ele mesmo cadastrou; a equipe interna enxerga tudo, opcionalmente filtrado. */
function scopeFilter(req: Request, clientId?: string) {
  if (req.user?.role === "CLIENT") {
    if (!req.user.clientId) throw new ForbiddenError();
    return { OR: [{ clientId: null }, { clientId: req.user.clientId }] };
  }
  if (clientId) return { OR: [{ clientId: null }, { clientId }] };
  return {};
}

export const listFailureCodes = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const { active, clientId } = req.query as { active?: string; clientId?: string };
  const codes = await prisma.failureCode.findMany({
    where: {
      ...scopeFilter(req, clientId),
      ...(active !== undefined ? { active: active === "true" } : {}),
    },
    orderBy: { code: "asc" },
  });
  res.json(codes);
});

const failureCodeSchema = z.object({
  code: z.string().min(1, "Informe o codigo."),
  description: z.string().min(2, "Informe a descricao."),
  category: z.string().nullish(),
  symptom: z.string().nullish(),
  mode: z.string().nullish(),
  mechanism: z.string().nullish(),
  cause: z.string().nullish(),
  correctiveAction: z.string().nullish(),
  applicableAssetFamily: z.string().nullish(),
  severity: z.nativeEnum(MaintenancePriority).nullish(),
  clientId: z.string().uuid().nullish(),
});

export const createFailureCode = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = failureCodeSchema.parse(req.body);
  if (req.user?.role === "CLIENT") {
    if (!req.user.clientId) throw new ForbiddenError();
    data.clientId = req.user.clientId;
  }
  const code = await prisma.failureCode.create({ data });
  res.status(201).json(code);
});

const updateSchema = failureCodeSchema.partial().extend({ active: z.boolean().optional() });

export const updateFailureCode = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = updateSchema.parse(req.body);
  const existing = await prisma.failureCode.findFirst({ where: { id: req.params.id } });
  if (!existing) throw new NotFoundError("Codigo de falha");

  if (req.user?.role === "CLIENT") {
    if (existing.clientId !== req.user.clientId) {
      throw new ForbiddenError("Este codigo faz parte do catalogo padrao e nao pode ser alterado.");
    }
    delete data.clientId;
  }

  const code = await prisma.failureCode.update({ where: { id: existing.id }, data });
  res.json(code);
});

export const deleteFailureCode = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const existing = await prisma.failureCode.findFirst({ where: { id: req.params.id } });
  if (!existing) throw new NotFoundError("Codigo de falha");

  if (req.user?.role === "CLIENT" && existing.clientId !== req.user.clientId) {
    throw new ForbiddenError("Este codigo faz parte do catalogo padrao e nao pode ser removido.");
  }

  const inUse = await prisma.maintenanceWorkOrder.count({ where: { failureCodeId: existing.id, deletedAt: null } });
  if (inUse > 0) throw new ValidationError("Este codigo ja foi usado em ordens de manutencao. Desative-o em vez de remover.");

  await prisma.failureCode.delete({ where: { id: existing.id } });
  res.status(204).send();
});
