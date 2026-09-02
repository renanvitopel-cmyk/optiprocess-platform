import type { InventoryMovementType } from "@prisma/client";
import { prisma } from "./prisma";
import { NotFoundError, ValidationError } from "../utils/errors";

interface StockMovementInput {
  productId: string;
  type: InventoryMovementType;
  quantity: number;
  reason?: string | null;
  relatedOrderId?: string | null;
  createdById?: string;
}

/** Aplica uma movimentacao de estoque e atualiza Product.stockQty numa unica transacao,
 * garantindo que o estoque nunca fique negativo. Usado pelo modulo de Produtos e estoque
 * (catalogo comercial, vendido aos clientes). */
export async function applyStockMovement(input: StockMovementInput) {
  const product = await prisma.product.findFirst({ where: { id: input.productId, deletedAt: null } });
  if (!product) throw new NotFoundError("Produto");

  const delta = input.type === "OUT" ? -input.quantity : input.quantity;
  const newStock = input.type === "ADJUSTMENT" ? input.quantity : product.stockQty + delta;
  if (newStock < 0) throw new ValidationError("Estoque nao pode ficar negativo.");

  const [movement] = await prisma.$transaction([
    prisma.inventoryMovement.create({ data: { ...input } }),
    prisma.product.update({ where: { id: product.id }, data: { stockQty: newStock } }),
  ]);

  return movement;
}

interface SparePartMovementInput {
  sparePartId: string;
  type: InventoryMovementType;
  quantity: number;
  reason?: string | null;
  maintenanceWorkOrderId?: string | null;
  createdById?: string;
}

/** Mesma logica do applyStockMovement, mas para o almoxarifado tecnico do CMMS (SparePart) -
 * estoque interno separado do catalogo comercial de Produtos. */
export async function applySparePartMovement(input: SparePartMovementInput) {
  const sparePart = await prisma.sparePart.findFirst({ where: { id: input.sparePartId, deletedAt: null } });
  if (!sparePart) throw new NotFoundError("Peca do almoxarifado");

  const delta = input.type === "OUT" ? -input.quantity : input.quantity;
  const newStock = input.type === "ADJUSTMENT" ? input.quantity : sparePart.stockQty + delta;
  if (newStock < 0) throw new ValidationError("Estoque nao pode ficar negativo.");

  const [movement] = await prisma.$transaction([
    prisma.sparePartMovement.create({ data: { ...input } }),
    prisma.sparePart.update({ where: { id: sparePart.id }, data: { stockQty: newStock } }),
  ]);

  return movement;
}
