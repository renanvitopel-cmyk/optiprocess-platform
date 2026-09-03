import { api } from "./client";
import type { AssetSystem } from "./types";

export async function listAssetSystems(params: { clientId?: string; areaId?: string; active?: boolean } = {}): Promise<AssetSystem[]> {
  const { data } = await api.get<AssetSystem[]>("/asset-systems", { params });
  return data;
}

export interface AssetSystemInput {
  name: string;
  code?: string | null;
  areaId: string;
  clientId?: string | null;
}

export async function createAssetSystem(input: AssetSystemInput): Promise<AssetSystem> {
  const { data } = await api.post<AssetSystem>("/asset-systems", input);
  return data;
}

export async function updateAssetSystem(id: string, input: Partial<AssetSystemInput & { active: boolean }>): Promise<AssetSystem> {
  const { data } = await api.patch<AssetSystem>(`/asset-systems/${id}`, input);
  return data;
}

export async function deleteAssetSystem(id: string): Promise<void> {
  await api.delete(`/asset-systems/${id}`);
}
