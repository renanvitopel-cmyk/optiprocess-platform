import { api } from "./client";
import type { MaintenancePlan, MaintenancePlanTemplate, MaintenanceTriggerType } from "./types";

export interface ListMaintenancePlanTemplatesParams {
  clientId?: string;
  active?: boolean;
}

export async function listMaintenancePlanTemplates(params: ListMaintenancePlanTemplatesParams = {}): Promise<MaintenancePlanTemplate[]> {
  const { data } = await api.get<MaintenancePlanTemplate[]>("/maintenance-plan-templates", { params });
  return data;
}

export async function getMaintenancePlanTemplate(id: string): Promise<MaintenancePlanTemplate> {
  const { data } = await api.get<MaintenancePlanTemplate>(`/maintenance-plan-templates/${id}`);
  return data;
}

export interface MaintenancePlanTemplateInput {
  clientId?: string | null;
  name: string;
  applicableAssetFamily?: string | null;
  triggerType: MaintenanceTriggerType;
  frequencyDays?: number | null;
  meterInterval?: number | null;
  toleranceDaysBefore?: number | null;
  toleranceDaysAfter?: number | null;
  procedure?: string | null;
  estimatedLaborHours?: number | null;
  checklistItems?: { description: string }[];
}

export async function createMaintenancePlanTemplate(input: MaintenancePlanTemplateInput): Promise<MaintenancePlanTemplate> {
  const { data } = await api.post<MaintenancePlanTemplate>("/maintenance-plan-templates", input);
  return data;
}

export async function updateMaintenancePlanTemplate(id: string, input: Partial<MaintenancePlanTemplateInput & { active: boolean }>): Promise<MaintenancePlanTemplate> {
  const { data } = await api.patch<MaintenancePlanTemplate>(`/maintenance-plan-templates/${id}`, input);
  return data;
}

export async function deleteMaintenancePlanTemplate(id: string): Promise<void> {
  await api.delete(`/maintenance-plan-templates/${id}`);
}

export async function applyMaintenancePlanTemplate(
  id: string,
  input: { instrumentId: string; meterId?: string | null; responsibleId?: string | null },
): Promise<MaintenancePlan> {
  const { data } = await api.post<MaintenancePlan>(`/maintenance-plan-templates/${id}/apply`, input);
  return data;
}
