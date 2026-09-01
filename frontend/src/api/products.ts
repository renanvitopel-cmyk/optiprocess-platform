import { api } from "./client";
import type { PagedResult } from "./client";
import type { InventoryMovementType, Product, ProductCategory, ProductStatus } from "./types";

export interface ListProductsParams {
  page?: number;
  pageSize?: number;
  categoryId?: string;
  search?: string;
  featured?: boolean;
  status?: ProductStatus;
}

export async function listProducts(params: ListProductsParams = {}): Promise<PagedResult<Product>> {
  const { data } = await api.get<PagedResult<Product>>("/products", { params });
  return data;
}

export async function getProduct(idOrSlug: string): Promise<Product> {
  const { data } = await api.get<Product>(`/products/${idOrSlug}`);
  return data;
}

export async function listProductCategories(): Promise<ProductCategory[]> {
  const { data } = await api.get<ProductCategory[]>("/products/categories");
  return data;
}

export async function createProductCategory(name: string): Promise<ProductCategory> {
  const { data } = await api.post<ProductCategory>("/products/categories", { name });
  return data;
}

export async function updateProductCategory(id: string, name: string): Promise<ProductCategory> {
  const { data } = await api.patch<ProductCategory>(`/products/categories/${id}`, { name });
  return data;
}

export async function deleteProductCategory(id: string): Promise<void> {
  await api.delete(`/products/categories/${id}`);
}

export type ProductInput = Partial<Omit<Product, "id" | "slug" | "category" | "images" | "stockQty">>;

export async function createProduct(input: ProductInput): Promise<Product> {
  const { data } = await api.post<Product>("/products", input);
  return data;
}

export async function updateProduct(id: string, input: ProductInput): Promise<Product> {
  const { data } = await api.patch<Product>(`/products/${id}`, input);
  return data;
}

export async function deleteProduct(id: string): Promise<void> {
  await api.delete(`/products/${id}`);
}

export interface InventoryMovement {
  id: string;
  productId: string;
  type: InventoryMovementType;
  quantity: number;
  reason: string | null;
  createdAt: string;
}

export async function listInventoryMovements(productId: string): Promise<InventoryMovement[]> {
  const { data } = await api.get<InventoryMovement[]>(`/products/${productId}/inventory-movements`);
  return data;
}

export async function createInventoryMovement(
  productId: string,
  input: { type: InventoryMovementType; quantity: number; reason?: string },
): Promise<InventoryMovement> {
  const { data } = await api.post<InventoryMovement>(`/products/${productId}/inventory-movements`, input);
  return data;
}
