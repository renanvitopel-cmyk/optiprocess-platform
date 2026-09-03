import { api } from "./client";
import type { PagedResult } from "./client";
import type { SparePart, SparePartMovement } from "./types";

export interface ListSparePartsParams {
  page?: number;
  pageSize?: number;
  clientId?: string;
  search?: string;
  active?: boolean;
}

export async function listSpareParts(params: ListSparePartsParams = {}): Promise<PagedResult<SparePart>> {
  const { data } = await api.get<PagedResult<SparePart>>("/spare-parts", { params });
  return data;
}

export async function getSparePart(id: string): Promise<SparePart> {
  const { data } = await api.get<SparePart>(`/spare-parts/${id}`);
  return data;
}

export interface SparePartInput {
  clientId?: string;
  name: string;
  code?: string | null;
  category?: string | null;
  unit?: string;
  minStock?: number;
  unitCost?: number | null;
}

export async function createSparePart(input: SparePartInput): Promise<SparePart> {
  const { data } = await api.post<SparePart>("/spare-parts", input);
  return data;
}

export async function updateSparePart(id: string, input: Partial<SparePartInput & { active: boolean }>): Promise<SparePart> {
  const { data } = await api.patch<SparePart>(`/spare-parts/${id}`, input);
  return data;
}

export async function deleteSparePart(id: string): Promise<void> {
  await api.delete(`/spare-parts/${id}`);
}

export async function addSparePartMovement(
  id: string,
  input: { type: "IN" | "OUT" | "ADJUSTMENT"; quantity: number; reason?: string; unitCost?: number | null },
): Promise<SparePartMovement> {
  const { data } = await api.post<SparePartMovement>(`/spare-parts/${id}/movements`, input);
  return data;
}
