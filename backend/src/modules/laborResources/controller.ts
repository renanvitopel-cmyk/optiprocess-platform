import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parsePageParams, toSkipTake, buildPagedResult } from "../../utils/pagination";
import { ForbiddenError, NotFoundError, ValidationError } from "../../utils/errors";
import { writeAuditLog } from "../../utils/audit";
import { clientScopeFilter, assertServiceAccess } from "../../middleware/rbac";

export const listLaborResources = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const pageParams = parsePageParams(req.query as Record<string, unknown>);
  const { clientId, search, active } = req.query as { clientId?: string; search?: string; active?: string };

  const where = {
    deletedAt: null,
    ...clientScopeFilter(req),
    ...(clientId ? { clientId } : {}),
    ...(active !== undefined ? { active: active === "true" } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { type: { contains: search, mode: "insensitive" as const } },
            { registrationNumber: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.laborResource.findMany({ where, orderBy: { name: "asc" }, ...toSkipTake(pageParams) }),
    prisma.laborResource.count({ where }),
  ]);

  res.json(buildPagedResult(items, total, pageParams));
});

export const getLaborResource = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const resource = await prisma.laborResource.findFirst({ where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) } });
  if (!resource) throw new NotFoundError("Recurso de mao de obra");
  res.json(resource);
});

const laborResourceSchema = z.object({
  clientId: z.string().uuid().optional(),
  type: z.string().min(1, "Informe o tipo de mao de obra."),
  name: z.string().min(2, "Informe o nome."),
  registrationNumber: z.string().nullish(),
  hourlyRate: z.coerce.number().nonnegative().nullish(),
});

export const createLaborResource = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = laborResourceSchema.parse(req.body);

  if (req.user?.role === "CLIENT") {
    if (!req.user.clientId) throw new ForbiddenError();
    data.clientId = req.user.clientId;
  } else if (!data.clientId) {
    throw new ValidationError("Selecione o cliente.");
  }

  const resource = await prisma.laborResource.create({ data: { ...data, clientId: data.clientId!, createdById: req.user?.sub } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "CREATE",
    entityType: "LaborResource",
    entityId: resource.id,
    description: `Mao de obra "${resource.name}" cadastrada`,
  });

  res.status(201).json(resource);
});

const updateSchema = laborResourceSchema.partial().extend({ active: z.boolean().optional() });

export const updateLaborResource = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = updateSchema.parse(req.body);
  const existing = await prisma.laborResource.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Recurso de mao de obra");

  if (req.user?.role === "CLIENT") {
    if (existing.clientId !== req.user.clientId) throw new ForbiddenError();
    delete data.clientId;
  }

  const resource = await prisma.laborResource.update({ where: { id: existing.id }, data });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "LaborResource",
    entityId: resource.id,
    description: `Mao de obra "${resource.name}" atualizada`,
  });

  res.json(resource);
});

export const deleteLaborResource = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.laborResource.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Recurso de mao de obra");
  if (req.user?.role === "CLIENT" && existing.clientId !== req.user.clientId) throw new ForbiddenError();

  await prisma.laborResource.update({ where: { id: existing.id }, data: { deletedAt: new Date(), active: false } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "DELETE",
    entityType: "LaborResource",
    entityId: existing.id,
    description: `Mao de obra "${existing.name}" removida`,
  });

  res.status(204).send();
});
