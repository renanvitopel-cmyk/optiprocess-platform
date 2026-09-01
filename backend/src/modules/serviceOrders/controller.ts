import type { Request, Response } from "express";
import { z } from "zod";
import { ServiceCategory, ServiceOrderStatus, ServiceOrderItemType } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parsePageParams, toSkipTake, buildPagedResult } from "../../utils/pagination";
import { NotFoundError, ForbiddenError } from "../../utils/errors";
import { writeAuditLog } from "../../utils/audit";
import { clientScopeFilter } from "../../middleware/rbac";
import { nextDocumentNumber } from "../../utils/sequence";

const detailInclude = {
  client: { select: { id: true, companyName: true, tradeName: true } },
  technician: { select: { id: true, name: true } },
  items: true,
};

export const listServiceOrders = asyncHandler(async (req: Request, res: Response) => {
  const pageParams = parsePageParams(req.query as Record<string, unknown>);
  const { clientId, status, technicianId, search } = req.query as {
    clientId?: string;
    status?: ServiceOrderStatus;
    technicianId?: string;
    search?: string;
  };

  const where = {
    deletedAt: null,
    ...clientScopeFilter(req),
    ...(clientId ? { clientId } : {}),
    ...(status ? { status } : {}),
    ...(technicianId ? { technicianId } : {}),
    ...(search ? { number: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.serviceOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...toSkipTake(pageParams),
      include: {
        client: { select: { id: true, companyName: true, tradeName: true } },
        technician: { select: { id: true, name: true } },
      },
    }),
    prisma.serviceOrder.count({ where }),
  ]);

  res.json(buildPagedResult(items, total, pageParams));
});

export const getServiceOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await prisma.serviceOrder.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    include: detailInclude,
  });
  if (!order) throw new NotFoundError("Ordem de servico");
  res.json(order);
});

const serviceOrderSchema = z.object({
  clientId: z.string().uuid(),
  siteAddress: z.string().min(2),
  category: z.nativeEnum(ServiceCategory),
  description: z.string().min(2),
  technicianId: z.string().uuid().nullish(),
  scheduledDate: z.coerce.date().nullish(),
  deadline: z.coerce.date().nullish(),
  laborHours: z.coerce.number().nullish(),
  status: z.nativeEnum(ServiceOrderStatus).optional(),
});

export const createServiceOrder = asyncHandler(async (req: Request, res: Response) => {
  const data = serviceOrderSchema.parse(req.body);
  const number = await nextDocumentNumber("serviceOrder");

  const order = await prisma.serviceOrder.create({
    data: { ...data, number, createdById: req.user?.sub },
    include: detailInclude,
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "CREATE",
    entityType: "ServiceOrder",
    entityId: order.id,
    description: `OS ${order.number} criada`,
  });

  res.status(201).json(order);
});

export const updateServiceOrder = asyncHandler(async (req: Request, res: Response) => {
  const data = serviceOrderSchema.partial().parse(req.body);
  const existing = await prisma.serviceOrder.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Ordem de servico");

  const order = await prisma.serviceOrder.update({ where: { id: existing.id }, data, include: detailInclude });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "ServiceOrder",
    entityId: order.id,
    description: `OS ${order.number} atualizada`,
  });

  res.json(order);
});

export const deleteServiceOrder = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.serviceOrder.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Ordem de servico");

  await prisma.serviceOrder.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "DELETE",
    entityType: "ServiceOrder",
    entityId: existing.id,
    description: `OS ${existing.number} cancelada/removida`,
  });

  res.status(204).send();
});

export const approveServiceOrder = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.serviceOrder.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Ordem de servico");
  if (req.user?.role === "CLIENT" && req.user.clientId !== existing.clientId) {
    throw new ForbiddenError();
  }

  const order = await prisma.serviceOrder.update({
    where: { id: existing.id },
    data: { clientApprovedAt: new Date(), status: existing.status === "BUDGET" ? "APPROVED" : existing.status },
    include: detailInclude,
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "APPROVE",
    entityType: "ServiceOrder",
    entityId: order.id,
    description: `OS ${order.number} aprovada pelo cliente`,
  });

  res.json(order);
});

const itemSchema = z.object({
  type: z.nativeEnum(ServiceOrderItemType),
  description: z.string().min(1),
  done: z.boolean().optional(),
  quantity: z.coerce.number().nullish(),
  unit: z.string().nullish(),
});

export const addServiceOrderItem = asyncHandler(async (req: Request, res: Response) => {
  const data = itemSchema.parse(req.body);
  const order = await prisma.serviceOrder.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!order) throw new NotFoundError("Ordem de servico");

  const item = await prisma.serviceOrderItem.create({ data: { ...data, serviceOrderId: order.id } });
  res.status(201).json(item);
});

export const updateServiceOrderItem = asyncHandler(async (req: Request, res: Response) => {
  const data = itemSchema.partial().parse(req.body);
  const item = await prisma.serviceOrderItem.findFirst({
    where: { id: req.params.itemId, serviceOrderId: req.params.id },
  });
  if (!item) throw new NotFoundError("Item da OS");

  const updated = await prisma.serviceOrderItem.update({ where: { id: item.id }, data });
  res.json(updated);
});

export const deleteServiceOrderItem = asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.serviceOrderItem.findFirst({
    where: { id: req.params.itemId, serviceOrderId: req.params.id },
  });
  if (!item) throw new NotFoundError("Item da OS");

  await prisma.serviceOrderItem.delete({ where: { id: item.id } });
  res.status(204).send();
});
