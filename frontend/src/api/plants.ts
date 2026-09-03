import { api } from "./client";
import type { Plant } from "./types";

export async function listPlants(params: { clientId?: string; active?: boolean } = {}): Promise<Plant[]> {
  const { data } = await api.get<Plant[]>("/plants", { params });
  return data;
}

export interface PlantInput {
  name: string;
  code?: string | null;
  clientId?: string | null;
}

export async function createPlant(input: PlantInput): Promise<Plant> {
  const { data } = await api.post<Plant>("/plants", input);
  return data;
}

export async function updatePlant(id: string, input: Partial<PlantInput & { active: boolean }>): Promise<Plant> {
  const { data } = await api.patch<Plant>(`/plants/${id}`, input);
  return data;
}

export async function deletePlant(id: string): Promise<void> {
  await api.delete(`/plants/${id}`);
}
