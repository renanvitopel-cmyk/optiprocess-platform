import { api } from "./client";
import type { FailureCode } from "./types";

export async function listFailureCodes(params: { active?: boolean } = {}): Promise<FailureCode[]> {
  const { data } = await api.get<FailureCode[]>("/failure-codes", { params });
  return data;
}

export interface FailureCodeInput {
  code: string;
  description: string;
  category?: string | null;
}

export async function createFailureCode(input: FailureCodeInput): Promise<FailureCode> {
  const { data } = await api.post<FailureCode>("/failure-codes", input);
  return data;
}

export async function updateFailureCode(id: string, input: Partial<FailureCodeInput & { active: boolean }>): Promise<FailureCode> {
  const { data } = await api.patch<FailureCode>(`/failure-codes/${id}`, input);
  return data;
}
