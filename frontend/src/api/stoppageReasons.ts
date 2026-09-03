import { api } from "./client";
import type { StoppageReason } from "./types";

export async function listStoppageReasons(params: { active?: boolean; clientId?: string } = {}): Promise<StoppageReason[]> {
  const { data } = await api.get<StoppageReason[]>("/stoppage-reasons", { params });
  return data;
}

export interface StoppageReasonInput {
  name: string;
  clientId?: string | null;
}

export async function createStoppageReason(input: StoppageReasonInput): Promise<StoppageReason> {
  const { data } = await api.post<StoppageReason>("/stoppage-reasons", input);
  return data;
}

export async function updateStoppageReason(id: string, input: Partial<StoppageReasonInput & { active: boolean }>): Promise<StoppageReason> {
  const { data } = await api.patch<StoppageReason>(`/stoppage-reasons/${id}`, input);
  return data;
}

export async function deleteStoppageReason(id: string): Promise<void> {
  await api.delete(`/stoppage-reasons/${id}`);
}
