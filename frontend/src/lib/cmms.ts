import { useAuth } from "../auth/AuthContext";

/**
 * Perfis do portal do cliente: o backend ja restringe as consultas de ativos a propria
 * empresa do usuario, entao os seletores (ex.: InstrumentPicker) nao pedem clientId.
 */
export function useCmms() {
  const { user } = useAuth();
  const isClient = !!user && ["CLIENT", "CLIENT_PLANNER", "CLIENT_TECHNICIAN", "REQUESTER"].includes(user.role);

  return { isClient };
}
