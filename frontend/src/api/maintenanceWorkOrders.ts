import { api } from "./client";
import type { PagedResult } from "./client";
import type {
  AttachmentCategory,
  CalibrationAttachment,
  ChecklistItemResult,
  MaintenanceDashboardData,
  MaintenanceOrderStatus,
  MaintenanceOrderType,
  MaintenancePartUsed,
  MaintenancePriority,
  MaintenanceWorkOrder,
  WorkOrderLaborEntry,
} from "./types";

export interface ListWorkOrdersParams {
  page?: number;
  pageSize?: number;
  clientId?: string;
  instrumentId?: string;
  planId?: string;
  status?: MaintenanceOrderStatus;
  type?: MaintenanceOrderType;
  technicianId?: string;
  search?: string;
}

export async function listMaintenanceWorkOrders(params: ListWorkOrdersParams = {}): Promise<PagedResult<MaintenanceWorkOrder>> {
  const { data } = await api.get<PagedResult<MaintenanceWorkOrder>>("/maintenance-work-orders", { params });
  return data;
}

export async function getMaintenanceWorkOrder(id: string): Promise<MaintenanceWorkOrder> {
  const { data } = await api.get<MaintenanceWorkOrder>(`/maintenance-work-orders/${id}`);
  return data;
}

export interface WorkOrderInput {
  clientId: string;
  instrumentId: string;
  type: MaintenanceOrderType;
  priority?: MaintenancePriority;
  description: string;
  technicianId?: string | null;
  scheduledDate?: string | null;
  failureCodeId?: string | null;
  laborHours?: number | null;
  observations?: string | null;
  checklist?: { description: string }[];
}

export async function createMaintenanceWorkOrder(input: WorkOrderInput): Promise<MaintenanceWorkOrder> {
  const { data } = await api.post<MaintenanceWorkOrder>("/maintenance-work-orders", input);
  return data;
}

export async function updateMaintenanceWorkOrder(id: string, input: Partial<WorkOrderInput> & { status?: MaintenanceOrderStatus }): Promise<MaintenanceWorkOrder> {
  const { data } = await api.patch<MaintenanceWorkOrder>(`/maintenance-work-orders/${id}`, input);
  return data;
}

export async function deleteMaintenanceWorkOrder(id: string): Promise<void> {
  await api.delete(`/maintenance-work-orders/${id}`);
}

export async function startMaintenanceWorkOrder(id: string): Promise<MaintenanceWorkOrder> {
  const { data } = await api.post<MaintenanceWorkOrder>(`/maintenance-work-orders/${id}/start`);
  return data;
}

export async function completeMaintenanceWorkOrder(id: string, meterReadingAtExecution?: number): Promise<MaintenanceWorkOrder> {
  const { data } = await api.post<MaintenanceWorkOrder>(`/maintenance-work-orders/${id}/complete`, { meterReadingAtExecution });
  return data;
}

export async function updateChecklistItem(
  workOrderId: string,
  itemId: string,
  input: { result?: ChecklistItemResult; notes?: string | null },
) {
  const { data } = await api.patch(`/maintenance-work-orders/${workOrderId}/checklist/${itemId}`, input);
  return data;
}

export async function addWorkOrderPart(
  workOrderId: string,
  input: { sparePartId: string; quantity: number; reason?: string },
): Promise<MaintenancePartUsed> {
  const { data } = await api.post<MaintenancePartUsed>(`/maintenance-work-orders/${workOrderId}/parts`, input);
  return data;
}

export async function removeWorkOrderPart(workOrderId: string, movementId: string): Promise<void> {
  await api.delete(`/maintenance-work-orders/${workOrderId}/parts/${movementId}`);
}

export async function addWorkOrderLabor(
  workOrderId: string,
  input: { laborResourceId: string; hours: number },
): Promise<WorkOrderLaborEntry> {
  const { data } = await api.post<WorkOrderLaborEntry>(`/maintenance-work-orders/${workOrderId}/labor`, input);
  return data;
}

export async function removeWorkOrderLabor(workOrderId: string, entryId: string): Promise<void> {
  await api.delete(`/maintenance-work-orders/${workOrderId}/labor/${entryId}`);
}

export async function listWorkOrderAttachments(id: string): Promise<CalibrationAttachment[]> {
  const { data } = await api.get<CalibrationAttachment[]>(`/maintenance-work-orders/${id}/attachments`);
  return data;
}

export async function uploadWorkOrderAttachment(
  id: string,
  file: File,
  category: AttachmentCategory,
  caption?: string,
): Promise<CalibrationAttachment> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category);
  if (caption) formData.append("caption", caption);
  const { data } = await api.post<CalibrationAttachment>(`/maintenance-work-orders/${id}/attachments`, formData);
  return data;
}

export async function deleteWorkOrderAttachment(id: string, attachmentId: string): Promise<void> {
  await api.delete(`/maintenance-work-orders/${id}/attachments/${attachmentId}`);
}

export async function getWorkOrderAttachmentUrl(id: string, attachmentId: string): Promise<string> {
  const { data } = await api.get<{ url: string }>(`/maintenance-work-orders/${id}/attachments/${attachmentId}/url`);
  return data.url;
}

export async function getMaintenanceDashboard(params: {
  clientId?: string;
  instrumentId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<MaintenanceDashboardData> {
  const { data } = await api.get<MaintenanceDashboardData>("/maintenance-work-orders/dashboard", { params });
  return data;
}
