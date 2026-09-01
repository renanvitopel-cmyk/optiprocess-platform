import { api } from "./client";
import type { PagedResult } from "./client";
import type { Client, ClientContact, ClientStatus } from "./types";

export interface ListClientsParams {
  page?: number;
  pageSize?: number;
  status?: ClientStatus;
  search?: string;
}

export async function listClients(params: ListClientsParams = {}): Promise<PagedResult<Client>> {
  const { data } = await api.get<PagedResult<Client>>("/clients", { params });
  return data;
}

export async function getClient(id: string): Promise<Client> {
  const { data } = await api.get<Client>(`/clients/${id}`);
  return data;
}

/** Portal do cliente: dados e contatos da propria empresa. */
export async function getOwnClient(): Promise<Client> {
  const { data } = await api.get<Client>("/clients/me");
  return data;
}

export type ClientInput = Partial<Omit<Client, "id" | "createdAt" | "contacts" | "_count">>;

export async function createClient(input: ClientInput): Promise<Client> {
  const { data } = await api.post<Client>("/clients", input);
  return data;
}

export async function updateClient(id: string, input: ClientInput): Promise<Client> {
  const { data } = await api.patch<Client>(`/clients/${id}`, input);
  return data;
}

export async function deleteClient(id: string): Promise<void> {
  await api.delete(`/clients/${id}`);
}

export type ClientContactInput = Partial<Omit<ClientContact, "id" | "clientId">>;

export async function addClientContact(clientId: string, input: ClientContactInput): Promise<ClientContact> {
  const { data } = await api.post<ClientContact>(`/clients/${clientId}/contacts`, input);
  return data;
}

export async function updateClientContact(
  clientId: string,
  contactId: string,
  input: ClientContactInput,
): Promise<ClientContact> {
  const { data } = await api.patch<ClientContact>(`/clients/${clientId}/contacts/${contactId}`, input);
  return data;
}

export async function deleteClientContact(clientId: string, contactId: string): Promise<void> {
  await api.delete(`/clients/${clientId}/contacts/${contactId}`);
}
