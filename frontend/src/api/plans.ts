import { api } from "./client";
import type { Plan } from "./types";

export async function listPlans(params: { active?: boolean } = {}): Promise<Plan[]> {
  const { data } = await api.get<Plan[]>("/plans", { params });
  return data;
}

export async function getPlan(id: string): Promise<Plan> {
  const { data } = await api.get<Plan>(`/plans/${id}`);
  return data;
}

export interface PlanInput {
  name: string;
  description?: string | null;
  priceMonthly?: number | null;
  maxUsers?: number | null;
  maxInstruments?: number | null;
  features?: string[];
}

export async function createPlan(input: PlanInput): Promise<Plan> {
  const { data } = await api.post<Plan>("/plans", input);
  return data;
}

export async function updatePlan(id: string, input: Partial<PlanInput & { active: boolean }>): Promise<Plan> {
  const { data } = await api.patch<Plan>(`/plans/${id}`, input);
  return data;
}

export async function deletePlan(id: string): Promise<void> {
  await api.delete(`/plans/${id}`);
}
