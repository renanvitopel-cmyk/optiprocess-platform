import { api } from "./client";
import type { PagedResult } from "./client";
import type { MaintenancePlan, MaintenanceTriggerType, MaintenancePlanStatus, MaintenancePlanType, MaintenancePlanScope, MaintenancePriority } from "./types";

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
  status?: MaintenancePlanStatus;
  planType?: MaintenancePlanType;
  scope?: MaintenancePlanScope;
  defaultPriority?: MaintenancePriority;
  specialtyId?: string | null;
  frequencyUnit?: string;
  frequencyEvery?: number | null;
  baseDate?: string | null;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  monthOfYear?: number | null;
  operationalCalendar?: string;
  blockedDates?: string[];
  generateAdvanceDays?: number | null;
  meterBaseReading?: number | null;
  generateAdvanceMeterUnits?: number | null;
  toleranceMeterBefore?: number | null;
  toleranceMeterAfter?: number | null;
  meterResetRule?: string;
  triggerMode?: string;
  conditionMeterId?: string | null;
  initialWorkOrderStatus?: string;
  requiresShutdown?: boolean;
  estimatedShutdownHours?: number | null;
  requiresOperationalRelease?: boolean;
  requiresLoto?: boolean;
  requiresApproval?: boolean;
  groupWorkOrder?: boolean;
  materialPolicy?: string;
  responsibleId?: string | null;
  checklistTemplate?: { description: string }[];
  toleranceDaysBefore?: number | null;
  toleranceDaysAfter?: number | null;
  procedure?: string | null;
  estimatedLaborHours?: number | null;
  templateId?: string | null;
  parts?: { sparePartId: string; quantity: number; required?: boolean; alternativeSparePartId?: string | null; suggestedSupplier?: string | null; notes?: string | null }[];
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
