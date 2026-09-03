import { api } from "./client";
import type { LaborType } from "./types";

export async function listLaborTypes(params: { active?: boolean; clientId?: string } = {}): Promise<LaborType[]> {
  const { data } = await api.get<LaborType[]>("/labor-types", { params });
  return data;
}

export interface LaborTypeInput {
  name: string;
  clientId?: string | null;
}

export async function createLaborType(input: LaborTypeInput): Promise<LaborType> {
  const { data } = await api.post<LaborType>("/labor-types", input);
  return data;
}

export async function updateLaborType(id: string, input: Partial<LaborTypeInput & { active: boolean }>): Promise<LaborType> {
  const { data } = await api.patch<LaborType>(`/labor-types/${id}`, input);
  return data;
}

export async function deleteLaborType(id: string): Promise<void> {
  await api.delete(`/labor-types/${id}`);
}
