import type { Request, Response } from "express";
import { z } from "zod";
import { QuoteStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parsePageParams, toSkipTake, buildPagedResult } from "../../utils/pagination";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { writeAuditLog } from "../../utils/audit";
import { clientScopeFilter } from "../../middleware/rbac";
import { nextDocumentNumber } from "../../utils/sequence";

const detailInclude = {
  client: { select: { id: true, companyName: true, tradeName: true } },
  items: { include: { product: { select: { id: true, name: true, sku: true, price: true } } } },
};

export const listQuotes = asyncHandler(async (req: Request, res: Response) => {
  const pageParams = parsePageParams(req.query as Record<string, unknown>);
  const { status, search } = req.query as { status?: QuoteStatus; search?: string };

  const where = {
    deletedAt: null,
    ...clientScopeFilter(req),
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { number: { contains: search, mode: "insensitive" as const } },
            { contactName: { contains: search, mode: "insensitive" as const } },
            { contactEmail: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.quote.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...toSkipTake(pageParams),
      include: { client: { select: { id: true, companyName: true, tradeName: true } }, _count: { select: { items: true } } },
    }),
    prisma.quote.count({ where }),
  ]);

  res.json(buildPagedResult(items, total, pageParams));
});

export const getQuote = asyncHandler(async (req: Request, res: Response) => {
  const quote = await prisma.quote.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    include: detailInclude,
  });
  if (!quote) throw new NotFoundError("Orcamento");
  res.json(quote);
});

const updateQuoteSchema = z.object({
  status: z.nativeEnum(QuoteStatus).optional(),
  shippingCost: z.coerce.number().nullish(),
  notes: z.string().nullish(),
  items: z
    .array(z.object({ id: z.string().uuid(), unitPriceOffered: z.coerce.number().nullable() }))
    .optional(),
});

export const updateQuote = asyncHandler(async (req: Request, res: Response) => {
  const data = updateQuoteSchema.parse(req.body);
  const existing = await prisma.quote.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Orcamento");

  if (data.items) {
    await Promise.all(
      data.items.map((item) =>
        prisma.quoteItem.update({ where: { id: item.id }, data: { unitPriceOffered: item.unitPriceOffered } }),
      ),
    );
  }

  const quote = await prisma.quote.update({
    where: { id: existing.id },
    data: { status: data.status, shippingCost: data.shippingCost, notes: data.notes },
    include: detailInclude,
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "Quote",
    entityId: quote.id,
    description: `Orcamento ${quote.number} atualizado`,
  });

  res.json(quote);
});

export const approveQuote = asyncHandler(async (req: Request, res: Response) => {
  const quote = await prisma.quote.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: { items: true },
  });
  if (!quote) throw new NotFoundError("Orcamento");
  if (!quote.clientId) throw new ValidationError("Vincule o orcamento a um cliente cadastrado antes de aprovar.");
  if (quote.items.length === 0) throw new ValidationError("Orcamento sem itens nao pode virar pedido.");

  const missingPrice = quote.items.find((i) => i.unitPriceOffered == null);
  if (missingPrice) throw new ValidationError("Defina o preco de todos os itens antes de aprovar.");

  const number = await nextDocumentNumber("order");
  const totalAmount =
    quote.items.reduce((sum, i) => sum + (i.unitPriceOffered ?? 0) * i.quantity, 0) + (quote.shippingCost ?? 0);

  const order = await prisma.order.create({
    data: {
      number,
      clientId: quote.clientId,
      quoteId: quote.id,
      shippingCost: quote.shippingCost ?? 0,
      totalAmount,
      items: {
        create: quote.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPriceOffered ?? 0,
          subtotal: (i.unitPriceOffered ?? 0) * i.quantity,
        })),
      },
      statusHistory: { create: { status: "PENDING", changedById: req.user?.sub, note: "Pedido gerado a partir do orcamento" } },
    },
    include: { items: true },
  });

  await prisma.quote.update({ where: { id: quote.id }, data: { status: "APPROVED" } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "APPROVE",
    entityType: "Quote",
    entityId: quote.id,
    description: `Orcamento ${quote.number} aprovado, pedido ${order.number} criado`,
  });

  res.status(201).json(order);
});

export const rejectQuote = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.quote.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Orcamento");

  const quote = await prisma.quote.update({ where: { id: existing.id }, data: { status: "REJECTED" } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "Quote",
    entityId: quote.id,
    description: `Orcamento ${quote.number} recusado`,
  });

  res.json(quote);
});
