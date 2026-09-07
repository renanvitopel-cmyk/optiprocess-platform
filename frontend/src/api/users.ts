import { api } from "./client";
import type { PagedResult } from "./client";
import type { Role, RoleDefinitionDto, UserAccount } from "./types";

export interface ListUsersParams {
  /** Empresa - a equipe do cliente ja e' restrita a propria, e nao precisa informar. */
  clientId?: string;
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

/** Um evento do historico de acessos da empresa. */
export interface EventoDeAcesso {
  id: string;
  action: string;
  description: string | null;
  createdAt: string;
  /** Quem fez. */
  user: { id: string; name: string; email: string } | null;
  /** Quem sofreu a acao. */
  alvo: { id: string; name: string; email: string; role: Role } | null;
}

export async function listarHistoricoDeAcessos(
  params: { clientId?: string; page?: number; pageSize?: number } = {},
): Promise<PagedResult<EventoDeAcesso>> {
  const { data } = await api.get<PagedResult<EventoDeAcesso>>("/users/historico", { params });
  return data;
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`);
}

export async function resetUserPassword(id: string): Promise<string> {
  const { data } = await api.post<{ temporaryPassword: string }>(`/users/${id}/reset-password`);
  return data.temporaryPassword;
}

/** Administrador define diretamente a senha de um usuario. */
export async function setUserPassword(id: string, password: string): Promise<void> {
  await api.post(`/users/${id}/password`, { password });
}

export async function listRoleDefinitions(): Promise<RoleDefinitionDto[]> {
  const { data } = await api.get<RoleDefinitionDto[]>("/users/roles");
  return data;
}
