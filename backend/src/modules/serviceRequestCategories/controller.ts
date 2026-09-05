import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { NotFoundError, ForbiddenError, ValidationError } from "../../utils/errors";
import { assertServiceAccess } from "../../middleware/rbac";

/** Mesmo padrao do AssetType/FailureCode: cliente enxerga o catalogo padrao da OptiProcess
 * (clientId nulo) somado ao que ele mesmo cadastrou; equipe interna enxerga tudo. */
function scopeFilter(req: Request, clientId?: string) {
  if (req.user?.role === "CLIENT") {
    if (!req.user.clientId) throw new ForbiddenError();
    return { OR: [{ clientId: null }, { clientId: req.user.clientId }] };
  }
  if (clientId) return { OR: [{ clientId: null }, { clientId }] };
  return {};
}

export const listServiceRequestCategories = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const { active, clientId } = req.query as { active?: string; clientId?: string };
  const categories = await prisma.serviceRequestCategory.findMany({
    where: {
      ...scopeFilter(req, clientId),
      ...(active !== undefined ? { active: active === "true" } : {}),
    },
    orderBy: { name: "asc" },
  });
  res.json(categories);
});

const categorySchema = z.object({
  name: z.string().min(2, "Informe o nome da categoria."),
  clientId: z.string().uuid().nullish(),
});

export const createServiceRequestCategory = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = categorySchema.parse(req.body);
  if (req.user?.role === "CLIENT") {
    if (!req.user.clientId) throw new ForbiddenError();
    data.clientId = req.user.clientId;
  }

  const existing = await prisma.serviceRequestCategory.findFirst({
    where: { clientId: data.clientId ?? null, name: { equals: data.name, mode: "insensitive" } },
  });
  if (existing) {
    // Este catalogo nao tem exclusao logica: remover apaga de vez. Basta reativar.
    if (!existing.active) {
      const reactivated = await prisma.serviceRequestCategory.update({ where: { id: existing.id }, data: { active: true } });
      return res.status(200).json(reactivated);
    }
    throw new ValidationError(`A categoria "${data.name}" ja existe.`);
  }

  const category = await prisma.serviceRequestCategory.create({ data });
  return res.status(201).json(category);
});

const updateSchema = categorySchema.partial().extend({ active: z.boolean().optional() });

export const updateServiceRequestCategory = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = updateSchema.parse(req.body);
  const existing = await prisma.serviceRequestCategory.findFirst({ where: { id: req.params.id } });
  if (!existing) throw new NotFoundError("Categoria de solicitacao");

  if (req.user?.role === "CLIENT") {
    if (existing.clientId !== req.user.clientId) {
      throw new ForbiddenError("Esta categoria faz parte do catalogo padrao e nao pode ser alterada.");
    }
    delete data.clientId;
  }

  const category = await prisma.serviceRequestCategory.update({ where: { id: existing.id }, data });
  res.json(category);
});

export const deleteServiceRequestCategory = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const existing = await prisma.serviceRequestCategory.findFirst({ where: { id: req.params.id } });
  if (!existing) throw new NotFoundError("Categoria de solicitacao");

  if (req.user?.role === "CLIENT" && existing.clientId !== req.user.clientId) {
    throw new ForbiddenError("Esta categoria faz parte do catalogo padrao e nao pode ser removida.");
  }

  const inUse = await prisma.serviceRequest.count({ where: { categoryId: existing.id } });
  if (inUse > 0) throw new ValidationError("Esta categoria ja esta em uso por alguma solicitacao. Desative-a em vez de remover.");

  await prisma.serviceRequestCategory.delete({ where: { id: existing.id } });
  res.status(204).send();
});
