import type { Request, Response } from "express";
import { z } from "zod";
import { OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parsePageParams, toSkipTake, buildPagedResult } from "../../utils/pagination";
import { NotFoundError } from "../../utils/errors";
import { writeAuditLog } from "../../utils/audit";
import { clientScopeFilter } from "../../middleware/rbac";

const detailInclude = {
  client: { select: { id: true, companyName: true, tradeName: true } },
  items: { include: { product: { select: { id: true, name: true, sku: true } } } },
  statusHistory: { orderBy: { createdAt: "desc" as const } },
};

export const listOrders = asyncHandler(async (req: Request, res: Response) => {
  const pageParams = parsePageParams(req.query as Record<string, unknown>);
  const { status, search } = req.query as { status?: OrderStatus; search?: string };

  const where = {
    deletedAt: null,
    ...clientScopeFilter(req),
    ...(status ? { status } : {}),
    ...(search ? { number: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...toSkipTake(pageParams),
      include: { client: { select: { id: true, companyName: true, tradeName: true } } },
    }),
    prisma.order.count({ where }),
  ]);

  res.json(buildPagedResult(items, total, pageParams));
});

export const getOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await prisma.order.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    include: detailInclude,
  });
  if (!order) throw new NotFoundError("Pedido");
  res.json(order);
});

const updateOrderSchema = z.object({
  deadline: z.coerce.date().nullish(),
  paymentMethod: z.nativeEnum(PaymentMethod).nullish(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  paymentNotes: z.string().nullish(),
});

export const updateOrder = asyncHandler(async (req: Request, res: Response) => {
  const data = updateOrderSchema.parse(req.body);
  const existing = await prisma.order.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Pedido");

  const order = await prisma.order.update({ where: { id: existing.id }, data, include: detailInclude });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "Order",
    entityId: order.id,
    description: `Pedido ${order.number} atualizado`,
  });

  res.json(order);
});

const statusChangeSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  note: z.string().nullish(),
});

export const changeOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const data = statusChangeSchema.parse(req.body);
  const existing = await prisma.order.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Pedido");

  const [order] = await prisma.$transaction([
    prisma.order.update({ where: { id: existing.id }, data: { status: data.status }, include: detailInclude }),
    prisma.orderStatusHistory.create({
      data: { orderId: existing.id, status: data.status, note: data.note, changedById: req.user?.sub },
    }),
  ]);

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "Order",
    entityId: order.id,
    description: `Pedido ${order.number} -> status ${data.status}`,
  });

  res.json(order);
});
