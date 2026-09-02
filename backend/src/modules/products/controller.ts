import type { Request, Response } from "express";
import { z } from "zod";
import { ProductStatus, InventoryMovementType, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parsePageParams, toSkipTake, buildPagedResult } from "../../utils/pagination";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { writeAuditLog } from "../../utils/audit";
import { STAFF_ROLES } from "../../middleware/rbac";
import { applyStockMovement } from "../../lib/inventory";

const ACCENT_MAP: Record<string, string> = {
  á: "a", à: "a", ã: "a", â: "a", ä: "a",
  é: "e", è: "e", ê: "e", ë: "e",
  í: "i", ì: "i", î: "i", ï: "i",
  ó: "o", ò: "o", õ: "o", ô: "o", ö: "o",
  ú: "u", ù: "u", û: "u", ü: "u",
  ç: "c", ñ: "n",
};

function slugify(text: string): string {
  const withoutAccents = text
    .toLowerCase()
    .split("")
    .map((char) => ACCENT_MAP[char] ?? char)
    .join("");

  return withoutAccents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const isStaff = (req: Request) => !!req.user && STAFF_ROLES.includes(req.user.role);

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const pageParams = parsePageParams(req.query as Record<string, unknown>);
  const { categoryId, search, featured, status } = req.query as {
    categoryId?: string;
    search?: string;
    featured?: string;
    status?: ProductStatus;
  };

  const staff = isStaff(req);

  const where = {
    deletedAt: null,
    ...(staff ? (status ? { status } : {}) : { status: "ACTIVE" as const }),
    ...(categoryId ? { categoryId } : {}),
    ...(featured === "true" ? { featured: true } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { sku: { contains: search, mode: "insensitive" as const } },
            { brand: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      ...toSkipTake(pageParams),
      include: { category: true },
    }),
    prisma.product.count({ where }),
  ]);

  res.json(buildPagedResult(items, total, pageParams));
});

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const staff = isStaff(req);
  const idOrSlug = req.params.idOrSlug;

  const product = await prisma.product.findFirst({
    where: {
      deletedAt: null,
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      ...(staff ? {} : { status: "ACTIVE" as const }),
    },
    include: { category: true },
  });
  if (!product) throw new NotFoundError("Produto");

  const attachments = await prisma.attachment.findMany({
    where: { entityType: "PRODUCT", entityId: product.id },
    orderBy: { sortOrder: "asc" },
  });

  res.json({ ...product, images: attachments });
});

export const listProductCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await prisma.productCategory.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  res.json(categories);
});

const categorySchema = z.object({ name: z.string().min(2) });

export const createProductCategory = asyncHandler(async (req: Request, res: Response) => {
  const data = categorySchema.parse(req.body);
  const category = await prisma.productCategory.create({ data: { name: data.name, slug: slugify(data.name) } });
  res.status(201).json(category);
});

export const updateProductCategory = asyncHandler(async (req: Request, res: Response) => {
  const data = categorySchema.parse(req.body);
  const category = await prisma.productCategory.update({
    where: { id: req.params.id },
    data: { name: data.name, slug: slugify(data.name) },
  });
  res.json(category);
});

export const deleteProductCategory = asyncHandler(async (req: Request, res: Response) => {
  const count = await prisma.product.count({ where: { categoryId: req.params.id, deletedAt: null } });
  if (count > 0) throw new ValidationError("Categoria possui produtos vinculados e nao pode ser removida.");
  await prisma.productCategory.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

const productSchema = z.object({
  name: z.string().min(2),
  sku: z.string().min(1),
  categoryId: z.string().uuid(),
  brand: z.string().nullish(),
  description: z.string().nullish(),
  technicalSheetUrl: z.string().url().nullish().or(z.literal("")),
  price: z.coerce.number().nullish(),
  promoPrice: z.coerce.number().nullish(),
  priceOnRequest: z.boolean().optional(),
  minStock: z.coerce.number().int().optional(),
  status: z.nativeEnum(ProductStatus).optional(),
  featured: z.boolean().optional(),
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const data = productSchema.parse(req.body);
  const baseSlug = slugify(data.name);
  const clashCount = await prisma.product.count({ where: { slug: { startsWith: baseSlug } } });
  const slug = clashCount === 0 ? baseSlug : `${baseSlug}-${clashCount + 1}`;

  const createData: Prisma.ProductUncheckedCreateInput = { ...data, slug, createdById: req.user?.sub };
  const product = await prisma.product.create({
    data: createData,
    include: { category: true },
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "CREATE",
    entityType: "Product",
    entityId: product.id,
    description: `Produto ${product.name} cadastrado`,
  });

  res.status(201).json(product);
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const data = productSchema.partial().parse(req.body);
  const existing = await prisma.product.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Produto");

  const updateData: Prisma.ProductUncheckedUpdateInput = { ...data };
  const product = await prisma.product.update({
    where: { id: existing.id },
    data: updateData,
    include: { category: true },
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "Product",
    entityId: product.id,
    description: `Produto ${product.name} atualizado`,
  });

  res.json(product);
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.product.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Produto");

  await prisma.product.update({ where: { id: existing.id }, data: { deletedAt: new Date(), status: "INACTIVE" } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "DELETE",
    entityType: "Product",
    entityId: existing.id,
    description: `Produto ${existing.name} removido`,
  });

  res.status(204).send();
});

const movementSchema = z.object({
  type: z.nativeEnum(InventoryMovementType),
  quantity: z.coerce.number().int().positive(),
  reason: z.string().nullish(),
});

export const listInventoryMovements = asyncHandler(async (req: Request, res: Response) => {
  const movements = await prisma.inventoryMovement.findMany({
    where: { productId: req.params.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(movements);
});

export const createInventoryMovement = asyncHandler(async (req: Request, res: Response) => {
  const data = movementSchema.parse(req.body);
  const movement = await applyStockMovement({ ...data, productId: req.params.id, createdById: req.user?.sub });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "Product",
    entityId: req.params.id,
    description: `Movimentacao de estoque (${data.type}) de ${data.quantity} un.`,
  });

  res.status(201).json(movement);
});
