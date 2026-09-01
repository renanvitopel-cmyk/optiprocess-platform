import { api } from "./client";
import type { PagedResult } from "./client";
import type { Order, OrderStatus, PaymentMethod, PaymentStatus } from "./types";

export interface ListOrdersParams {
  page?: number;
  pageSize?: number;
  status?: OrderStatus;
  search?: string;
}

export async function listOrders(params: ListOrdersParams = {}): Promise<PagedResult<Order>> {
  const { data } = await api.get<PagedResult<Order>>("/orders", { params });
  return data;
}

export async function getOrder(id: string): Promise<Order> {
  const { data } = await api.get<Order>(`/orders/${id}`);
  return data;
}

export async function updateOrder(
  id: string,
  input: {
    deadline?: string | null;
    paymentMethod?: PaymentMethod | null;
    paymentStatus?: PaymentStatus;
    paymentNotes?: string | null;
  },
): Promise<Order> {
  const { data } = await api.patch<Order>(`/orders/${id}`, input);
  return data;
}

export async function changeOrderStatus(id: string, status: OrderStatus, note?: string): Promise<Order> {
  const { data } = await api.post<Order>(`/orders/${id}/status`, { status, note });
  return data;
}
