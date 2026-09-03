import { api } from "./client";
import type { CostCenter } from "./types";

export async function listCostCenters(params: { clientId?: string; active?: boolean } = {}): Promise<CostCenter[]> {
  const { data } = await api.get<CostCenter[]>("/cost-centers", { params });
  return data;
}

export interface CostCenterInput {
  name: string;
  code?: string | null;
  clientId?: string | null;
}

export async function createCostCenter(input: CostCenterInput): Promise<CostCenter> {
  const { data } = await api.post<CostCenter>("/cost-centers", input);
  return data;
}

export async function updateCostCenter(id: string, input: Partial<CostCenterInput & { active: boolean }>): Promise<CostCenter> {
  const { data } = await api.patch<CostCenter>(`/cost-centers/${id}`, input);
  return data;
}

export async function deleteCostCenter(id: string): Promise<void> {
  await api.delete(`/cost-centers/${id}`);
}
