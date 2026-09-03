import { api } from "./client";
import type { PagedResult } from "./client";
import type { MaintenancePlan, MaintenanceTriggerType } from "./types";

export interface ListMaintenancePlansParams {
  page?: number;
  pageSize?: number;
  clientId?: string;
  instrumentId?: string;
  active?: boolean;
}

export async function listMaintenancePlans(params: ListMaintenancePlansParams = {}): Promise<PagedResult<MaintenancePlan>> {
  const { data } = await api.get<PagedResult<MaintenancePlan>>("/maintenance-plans", { params });
  return data;
}

export async function getMaintenancePlan(id: string): Promise<MaintenancePlan> {
  const { data } = await api.get<MaintenancePlan>(`/maintenance-plans/${id}`);
  return data;
}

export interface MaintenancePlanInput {
  clientId: string;
  instrumentId: string;
  name: string;
  description?: string | null;
  triggerType: MaintenanceTriggerType;
  frequencyDays?: number | null;
  meterId?: string | null;
  meterInterval?: number | null;
  active?: boolean;
  responsibleId?: string | null;
  checklistTemplate?: { description: string }[];
  toleranceDaysBefore?: number | null;
  toleranceDaysAfter?: number | null;
  procedure?: string | null;
  estimatedLaborHours?: number | null;
  templateId?: string | null;
  parts?: { sparePartId: string; quantity: number }[];
}

export async function createMaintenancePlan(input: MaintenancePlanInput): Promise<MaintenancePlan> {
  const { data } = await api.post<MaintenancePlan>("/maintenance-plans", input);
  return data;
}

export async function updateMaintenancePlan(id: string, input: Partial<MaintenancePlanInput>): Promise<MaintenancePlan> {
  const { data } = await api.patch<MaintenancePlan>(`/maintenance-plans/${id}`, input);
  return data;
}

export async function deleteMaintenancePlan(id: string): Promise<void> {
  await api.delete(`/maintenance-plans/${id}`);
}

export async function generateWorkOrderFromPlan(id: string): Promise<{ id: string; number: string }> {
  const { data } = await api.post(`/maintenance-plans/${id}/generate`);
  return data;
}
