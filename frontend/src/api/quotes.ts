import { api } from "./client";
import type { PagedResult } from "./client";
import type { Order, Quote, QuoteStatus } from "./types";

export interface ListQuotesParams {
  page?: number;
  pageSize?: number;
  status?: QuoteStatus;
  search?: string;
}

export async function listQuotes(params: ListQuotesParams = {}): Promise<PagedResult<Quote>> {
  const { data } = await api.get<PagedResult<Quote>>("/quotes", { params });
  return data;
}

export async function getQuote(id: string): Promise<Quote> {
  const { data } = await api.get<Quote>(`/quotes/${id}`);
  return data;
}

export async function updateQuote(
  id: string,
  input: {
    status?: QuoteStatus;
    shippingCost?: number | null;
    notes?: string | null;
    items?: { id: string; unitPriceOffered: number | null }[];
  },
): Promise<Quote> {
  const { data } = await api.patch<Quote>(`/quotes/${id}`, input);
  return data;
}

export async function approveQuote(id: string): Promise<Order> {
  const { data } = await api.post<Order>(`/quotes/${id}/approve`);
  return data;
}

export async function rejectQuote(id: string): Promise<Quote> {
  const { data } = await api.post<Quote>(`/quotes/${id}/reject`);
  return data;
}
