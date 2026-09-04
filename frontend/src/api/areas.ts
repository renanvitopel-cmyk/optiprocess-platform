import { api } from "./client";
import type { Area } from "./types";

export async function listAreas(params: { clientId?: string; plantId?: string; active?: boolean } = {}): Promise<Area[]> {
  const { data } = await api.get<Area[]>("/areas", { params });
  return data;
}

export interface AreaInput {
  costCenterId?: string | null;
  name: string;
  code?: string | null;
  plantId: string;
  clientId?: string | null;
}

export async function createArea(input: AreaInput): Promise<Area> {
  const { data } = await api.post<Area>("/areas", input);
  return data;
}

export async function updateArea(id: string, input: Partial<AreaInput & { active: boolean }>): Promise<Area> {
  const { data } = await api.patch<Area>(`/areas/${id}`, input);
  return data;
}

export async function deleteArea(id: string): Promise<void> {
  await api.delete(`/areas/${id}`);
}
