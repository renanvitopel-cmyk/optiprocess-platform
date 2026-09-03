import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { NotFoundError, ForbiddenError, ValidationError } from "../../utils/errors";
import { assertServiceAccess } from "../../middleware/rbac";

/** Mesmo padrao do AssetType: cliente enxerga o catalogo padrao da OptiProcess (clientId
 * nulo) somado ao que ele mesmo cadastrou; equipe interna enxerga tudo. */
function scopeFilter(req: Request, clientId?: string) {
  if (req.user?.role === "CLIENT") {
    if (!req.user.clientId) throw new ForbiddenError();
    return { OR: [{ clientId: null }, { clientId: req.user.clientId }] };
  }
  if (clientId) return { OR: [{ clientId: null }, { clientId }] };
  return {};
}

export const listLaborTypes = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const { active, clientId } = req.query as { active?: string; clientId?: string };
  const types = await prisma.laborType.findMany({
    where: {
      ...scopeFilter(req, clientId),
      ...(active !== undefined ? { active: active === "true" } : {}),
    },
    orderBy: { name: "asc" },
  });
  res.json(types);
});

const laborTypeSchema = z.object({
  name: z.string().min(2, "Informe o nome do tipo."),
  clientId: z.string().uuid().nullish(),
});

export const createLaborType = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = laborTypeSchema.parse(req.body);
  if (req.user?.role === "CLIENT") {
    if (!req.user.clientId) throw new ForbiddenError();
    data.clientId = req.user.clientId;
  }

  const existing = await prisma.laborType.findFirst({
    where: { clientId: data.clientId ?? null, name: { equals: data.name, mode: "insensitive" } },
  });
  if (existing) {
    if (!existing.active) {
      const reactivated = await prisma.laborType.update({ where: { id: existing.id }, data: { active: true } });
      return res.status(200).json(reactivated);
    }
    throw new ValidationError(`O tipo "${data.name}" ja existe.`);
  }

  const type = await prisma.laborType.create({ data });
  return res.status(201).json(type);
});

const updateSchema = laborTypeSchema.partial().extend({ active: z.boolean().optional() });

export const updateLaborType = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = updateSchema.parse(req.body);
  const existing = await prisma.laborType.findFirst({ where: { id: req.params.id } });
  if (!existing) throw new NotFoundError("Tipo de mao de obra");

  if (req.user?.role === "CLIENT") {
    if (existing.clientId !== req.user.clientId) {
      throw new ForbiddenError("Este tipo faz parte do catalogo padrao e nao pode ser alterado.");
    }
    delete data.clientId;
  }

  const type = await prisma.laborType.update({ where: { id: existing.id }, data });
  res.json(type);
});

export const deleteLaborType = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const existing = await prisma.laborType.findFirst({ where: { id: req.params.id } });
  if (!existing) throw new NotFoundError("Tipo de mao de obra");

  if (req.user?.role === "CLIENT" && existing.clientId !== req.user.clientId) {
    throw new ForbiddenError("Este tipo faz parte do catalogo padrao e nao pode ser removido.");
  }

  const inUse = await prisma.laborResource.count({ where: { type: { equals: existing.name, mode: "insensitive" } } });
  if (inUse > 0) throw new ValidationError("Este tipo ja esta em uso por algum recurso de mao de obra. Desative-o em vez de remover.");

  await prisma.laborType.delete({ where: { id: existing.id } });
  res.status(204).send();
});
