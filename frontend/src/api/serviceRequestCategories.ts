import { api } from "./client";
import type { ServiceRequestCategory } from "./types";

export async function listServiceRequestCategories(params: { active?: boolean; clientId?: string } = {}): Promise<ServiceRequestCategory[]> {
  const { data } = await api.get<ServiceRequestCategory[]>("/service-request-categories", { params });
  return data;
}

export interface ServiceRequestCategoryInput {
  name: string;
  clientId?: string | null;
}

export async function createServiceRequestCategory(input: ServiceRequestCategoryInput): Promise<ServiceRequestCategory> {
  const { data } = await api.post<ServiceRequestCategory>("/service-request-categories", input);
  return data;
}

export async function updateServiceRequestCategory(id: string, input: Partial<ServiceRequestCategoryInput & { active: boolean }>): Promise<ServiceRequestCategory> {
  const { data } = await api.patch<ServiceRequestCategory>(`/service-request-categories/${id}`, input);
  return data;
}

export async function deleteServiceRequestCategory(id: string): Promise<void> {
  await api.delete(`/service-request-categories/${id}`);
}
