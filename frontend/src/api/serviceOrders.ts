import { api } from "./client";
import type { PagedResult } from "./client";
import type { ServiceOrder, ServiceOrderItem, ServiceOrderItemType, ServiceOrderStatus } from "./types";

export interface ListServiceOrdersParams {
  page?: number;
  pageSize?: number;
  clientId?: string;
  status?: ServiceOrderStatus;
  technicianId?: string;
  search?: string;
}

export async function listServiceOrders(params: ListServiceOrdersParams = {}): Promise<PagedResult<ServiceOrder>> {
  const { data } = await api.get<PagedResult<ServiceOrder>>("/service-orders", { params });
  return data;
}

export async function getServiceOrder(id: string): Promise<ServiceOrder> {
  const { data } = await api.get<ServiceOrder>(`/service-orders/${id}`);
  return data;
}

export type ServiceOrderInput = Partial<
  Omit<ServiceOrder, "id" | "number" | "createdAt" | "items" | "client" | "technician" | "clientApprovedAt">
>;

export async function createServiceOrder(input: ServiceOrderInput): Promise<ServiceOrder> {
  const { data } = await api.post<ServiceOrder>("/service-orders", input);
  return data;
}

export async function updateServiceOrder(id: string, input: ServiceOrderInput): Promise<ServiceOrder> {
  const { data } = await api.patch<ServiceOrder>(`/service-orders/${id}`, input);
  return data;
}

export async function deleteServiceOrder(id: string): Promise<void> {
  await api.delete(`/service-orders/${id}`);
}

export async function approveServiceOrder(id: string): Promise<ServiceOrder> {
  const { data } = await api.post<ServiceOrder>(`/service-orders/${id}/approve`);
  return data;
}

export async function addServiceOrderItem(
  orderId: string,
  input: { type: ServiceOrderItemType; description: string; quantity?: number | null; unit?: string | null },
): Promise<ServiceOrderItem> {
  const { data } = await api.post<ServiceOrderItem>(`/service-orders/${orderId}/items`, input);
  return data;
}

export async function updateServiceOrderItem(
  orderId: string,
  itemId: string,
  input: Partial<Pick<ServiceOrderItem, "description" | "done" | "quantity" | "unit">>,
): Promise<ServiceOrderItem> {
  const { data } = await api.patch<ServiceOrderItem>(`/service-orders/${orderId}/items/${itemId}`, input);
  return data;
}

export async function deleteServiceOrderItem(orderId: string, itemId: string): Promise<void> {
  await api.delete(`/service-orders/${orderId}/items/${itemId}`);
}
