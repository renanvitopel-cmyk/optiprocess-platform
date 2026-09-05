import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { NotFoundError, ForbiddenError, ValidationError } from "../../utils/errors";
import { assertServiceAccess } from "../../middleware/rbac";

/** Mesmo padrao do FailureCode/AssetType: cliente enxerga o catalogo padrao da OptiProcess
 * (clientId nulo) somado ao que ele mesmo cadastrou; equipe interna enxerga tudo. */
function scopeFilter(req: Request, clientId?: string) {
  if (req.user?.role === "CLIENT") {
    if (!req.user.clientId) throw new ForbiddenError();
    return { OR: [{ clientId: null }, { clientId: req.user.clientId }] };
  }
  if (clientId) return { OR: [{ clientId: null }, { clientId }] };
  return {};
}

export const listStoppageReasons = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const { active, clientId } = req.query as { active?: string; clientId?: string };
  const reasons = await prisma.stoppageReason.findMany({
    where: {
      ...scopeFilter(req, clientId),
      ...(active !== undefined ? { active: active === "true" } : {}),
    },
    orderBy: { name: "asc" },
  });
  res.json(reasons);
});

const reasonSchema = z.object({
  name: z.string().min(2, "Informe o nome do motivo."),
  clientId: z.string().uuid().nullish(),
});

export const createStoppageReason = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = reasonSchema.parse(req.body);
  if (req.user?.role === "CLIENT") {
    if (!req.user.clientId) throw new ForbiddenError();
    data.clientId = req.user.clientId;
  }

  const existing = await prisma.stoppageReason.findFirst({
    where: { clientId: data.clientId ?? null, name: { equals: data.name, mode: "insensitive" } },
  });
  if (existing) {
    // Este catalogo nao tem exclusao logica: remover apaga de vez. Basta reativar.
    if (!existing.active) {
      const reactivated = await prisma.stoppageReason.update({ where: { id: existing.id }, data: { active: true } });
      return res.status(200).json(reactivated);
    }
    throw new ValidationError(`O motivo "${data.name}" ja existe.`);
  }

  const reason = await prisma.stoppageReason.create({ data });
  return res.status(201).json(reason);
});

const updateSchema = reasonSchema.partial().extend({ active: z.boolean().optional() });

export const updateStoppageReason = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = updateSchema.parse(req.body);
  const existing = await prisma.stoppageReason.findFirst({ where: { id: req.params.id } });
  if (!existing) throw new NotFoundError("Motivo de parada");

  if (req.user?.role === "CLIENT") {
    if (existing.clientId !== req.user.clientId) {
      throw new ForbiddenError("Este motivo faz parte do catalogo padrao e nao pode ser alterado.");
    }
    delete data.clientId;
  }

  const reason = await prisma.stoppageReason.update({ where: { id: existing.id }, data });
  res.json(reason);
});

export const deleteStoppageReason = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const existing = await prisma.stoppageReason.findFirst({ where: { id: req.params.id } });
  if (!existing) throw new NotFoundError("Motivo de parada");

  if (req.user?.role === "CLIENT" && existing.clientId !== req.user.clientId) {
    throw new ForbiddenError("Este motivo faz parte do catalogo padrao e nao pode ser removido.");
  }

  const inUse = await prisma.workOrderStoppage.count({ where: { reasonId: existing.id } });
  if (inUse > 0) throw new ValidationError("Este motivo ja esta em uso em alguma parada. Desative-o em vez de remover.");

  await prisma.stoppageReason.delete({ where: { id: existing.id } });
  res.status(204).send();
});
