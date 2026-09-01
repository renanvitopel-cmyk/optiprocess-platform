import { api } from "./client";
import type { PagedResult } from "./client";
import type { Role, RoleDefinitionDto, UserAccount } from "./types";

export interface ListUsersParams {
  page?: number;
  pageSize?: number;
  role?: Role;
  active?: boolean;
  search?: string;
}

export async function listUsers(params: ListUsersParams = {}): Promise<PagedResult<UserAccount>> {
  const { data } = await api.get<PagedResult<UserAccount>>("/users", { params });
  return data;
}

export async function getUser(id: string): Promise<UserAccount> {
  const { data } = await api.get<UserAccount>(`/users/${id}`);
  return data;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
  clientId?: string | null;
}

export async function createUser(input: CreateUserInput): Promise<UserAccount> {
  const { data } = await api.post<UserAccount>("/users", input);
  return data;
}

export async function updateUser(
  id: string,
  input: Partial<{ name: string; role: Role; clientId: string | null; active: boolean }>,
): Promise<UserAccount> {
  const { data } = await api.patch<UserAccount>(`/users/${id}`, input);
  return data;
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`);
}

export async function resetUserPassword(id: string): Promise<string> {
  const { data } = await api.post<{ temporaryPassword: string }>(`/users/${id}/reset-password`);
  return data.temporaryPassword;
}

export async function listRoleDefinitions(): Promise<RoleDefinitionDto[]> {
  const { data } = await api.get<RoleDefinitionDto[]>("/users/roles");
  return data;
}
