import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parsePageParams, toSkipTake, buildPagedResult } from "../../utils/pagination";
import { ForbiddenError, NotFoundError, ValidationError } from "../../utils/errors";
import { writeAuditLog } from "../../utils/audit";
import { clientScopeFilter, assertServiceAccess } from "../../middleware/rbac";
import { applySparePartMovement } from "../../lib/inventory";

export const listSpareParts = asyncHandler(async (req: Request, res: Response) => {
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
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const sparePart = await prisma.sparePart.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    include: { movements: { orderBy: { createdAt: "desc" }, take: 20 } },
  });
  if (!sparePart) throw new NotFoundError("Peca do almoxarifado");
  res.json(sparePart);
});

const sparePartSchema = z.object({
  // Opcional aqui pelo mesmo motivo do Ativo: o portal do cliente nunca envia clientId
  // (o backend forca a propria empresa); obrigatorio so para a equipe interna.
  clientId: z.string().uuid().optional(),
  name: z.string().min(2, "Informe o nome da peca."),
  code: z.string().nullish(),
  category: z.string().nullish(),
  unit: z.string().min(1).optional(),
  minStock: z.coerce.number().int().nonnegative().optional(),
});

export const createSparePart = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = sparePartSchema.parse(req.body);

  if (req.user?.role === "CLIENT") {
    if (!req.user.clientId) throw new ForbiddenError();
    data.clientId = req.user.clientId;
  } else if (!data.clientId) {
    throw new ValidationError("Selecione o cliente.");
  }

  const sparePart = await prisma.sparePart.create({ data: { ...data, clientId: data.clientId!, createdById: req.user?.sub } });

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
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = updateSchema.parse(req.body);
  const existing = await prisma.sparePart.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Peca do almoxarifado");

  if (req.user?.role === "CLIENT") {
    if (existing.clientId !== req.user.clientId) throw new ForbiddenError();
    delete data.clientId; // cliente nunca transfere a peca para outra empresa
  }

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
  if (req.user?.role === "CLIENT" && existing.clientId !== req.user.clientId) throw new ForbiddenError();

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
  const existing = await prisma.sparePart.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Peca do almoxarifado");
  if (req.user?.role === "CLIENT" && existing.clientId !== req.user.clientId) throw new ForbiddenError();

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
