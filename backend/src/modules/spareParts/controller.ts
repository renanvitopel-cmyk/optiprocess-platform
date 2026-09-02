import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parsePageParams, toSkipTake, buildPagedResult } from "../../utils/pagination";
import { NotFoundError } from "../../utils/errors";
import { writeAuditLog } from "../../utils/audit";
import { applySparePartMovement } from "../../lib/inventory";

export const listSpareParts = asyncHandler(async (req: Request, res: Response) => {
  const pageParams = parsePageParams(req.query as Record<string, unknown>);
  const { search, active } = req.query as { search?: string; active?: string };

  const where = {
    deletedAt: null,
    ...(active !== undefined ? { active: active === "true" } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { code: { contains: search, mode: "insensitive" as const } },
            { category: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.sparePart.findMany({ where, orderBy: { name: "asc" }, ...toSkipTake(pageParams) }),
    prisma.sparePart.count({ where }),
  ]);

  res.json(buildPagedResult(items, total, pageParams));
});

export const getSparePart = asyncHandler(async (req: Request, res: Response) => {
  const sparePart = await prisma.sparePart.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: { movements: { orderBy: { createdAt: "desc" }, take: 20 } },
  });
  if (!sparePart) throw new NotFoundError("Peca do almoxarifado");
  res.json(sparePart);
});

const sparePartSchema = z.object({
  name: z.string().min(2, "Informe o nome da peca."),
  code: z.string().nullish(),
  category: z.string().nullish(),
  unit: z.string().min(1).optional(),
  minStock: z.coerce.number().int().nonnegative().optional(),
});

export const createSparePart = asyncHandler(async (req: Request, res: Response) => {
  const data = sparePartSchema.parse(req.body);
  const sparePart = await prisma.sparePart.create({ data: { ...data, createdById: req.user?.sub } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "CREATE",
    entityType: "SparePart",
    entityId: sparePart.id,
    description: `Peca do almoxarifado "${sparePart.name}" cadastrada`,
  });

  res.status(201).json(sparePart);
});

const updateSchema = sparePartSchema.partial().extend({ active: z.boolean().optional() });

export const updateSparePart = asyncHandler(async (req: Request, res: Response) => {
  const data = updateSchema.parse(req.body);
  const existing = await prisma.sparePart.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Peca do almoxarifado");

  const sparePart = await prisma.sparePart.update({ where: { id: existing.id }, data });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "SparePart",
    entityId: sparePart.id,
    description: `Peca do almoxarifado "${sparePart.name}" atualizada`,
  });

  res.json(sparePart);
});

export const deleteSparePart = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.sparePart.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Peca do almoxarifado");

  await prisma.sparePart.update({ where: { id: existing.id }, data: { deletedAt: new Date(), active: false } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "DELETE",
    entityType: "SparePart",
    entityId: existing.id,
    description: `Peca do almoxarifado "${existing.name}" removida`,
  });

  res.status(204).send();
});

const movementSchema = z.object({
  type: z.enum(["IN", "OUT", "ADJUSTMENT"]),
  quantity: z.coerce.number().int().positive(),
  reason: z.string().nullish(),
});

export const addSparePartMovement = asyncHandler(async (req: Request, res: Response) => {
  const data = movementSchema.parse(req.body);
  const movement = await applySparePartMovement({ ...data, sparePartId: req.params.id, createdById: req.user?.sub });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "SparePart",
    entityId: req.params.id,
    description: `Movimentacao de estoque (${data.type}) de ${data.quantity} un. no almoxarifado`,
  });

  res.status(201).json(movement);
});
