import { api } from "./client";
import type { PagedResult } from "./client";
import type { LaborResource } from "./types";

export interface ListLaborResourcesParams {
  page?: number;
  pageSize?: number;
  clientId?: string;
  search?: string;
  active?: boolean;
}

export async function listLaborResources(params: ListLaborResourcesParams = {}): Promise<PagedResult<LaborResource>> {
  const { data } = await api.get<PagedResult<LaborResource>>("/labor-resources", { params });
  return data;
}

export async function getLaborResource(id: string): Promise<LaborResource> {
  const { data } = await api.get<LaborResource>(`/labor-resources/${id}`);
  return data;
}

export interface LaborResourceInput {
  clientId?: string;
  type: string;
  name: string;
  registrationNumber?: string | null;
  hourlyRate?: number | null;
}

export async function createLaborResource(input: LaborResourceInput): Promise<LaborResource> {
  const { data } = await api.post<LaborResource>("/labor-resources", input);
  return data;
}

export async function updateLaborResource(id: string, input: Partial<LaborResourceInput & { active: boolean }>): Promise<LaborResource> {
  const { data } = await api.patch<LaborResource>(`/labor-resources/${id}`, input);
  return data;
}

export async function deleteLaborResource(id: string): Promise<void> {
  await api.delete(`/labor-resources/${id}`);
}
