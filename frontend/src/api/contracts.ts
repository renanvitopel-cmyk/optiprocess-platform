import { api } from "./client";
import type { PagedResult } from "./client";
import type { ContractStatus, ServiceContract } from "./types";

export interface ListContractsParams {
  page?: number;
  pageSize?: number;
  clientId?: string;
  status?: ContractStatus;
}

export async function listContracts(params: ListContractsParams = {}): Promise<PagedResult<ServiceContract>> {
  const { data } = await api.get<PagedResult<ServiceContract>>("/contracts", { params });
  return data;
}

export async function getContract(id: string): Promise<ServiceContract> {
  const { data } = await api.get<ServiceContract>(`/contracts/${id}`);
  return data;
}

export type ContractInput = Partial<Omit<ServiceContract, "id" | "createdAt" | "client" | "responsible" | "derivedStatus">>;

export async function createContract(input: ContractInput): Promise<ServiceContract> {
  const { data } = await api.post<ServiceContract>("/contracts", input);
  return data;
}

export async function updateContract(id: string, input: ContractInput): Promise<ServiceContract> {
  const { data } = await api.patch<ServiceContract>(`/contracts/${id}`, input);
  return data;
}

export async function deleteContract(id: string): Promise<void> {
  await api.delete(`/contracts/${id}`);
}
