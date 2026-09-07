import { api } from "./client";
import type { PagedResult } from "./client";
import type {
  Lubricant,
  LubricantInput,
  LubricationDashboard,
  LubricationForecast,
  LubricationPoint,
  LubricationPointInput,
  LubricationRecord,
  LubricationRecordInput,
  LubricationRoute,
  LubricationRouteInput,
} from "./types";

// ── Lubrificantes ────────────────────────────────────────────────────────────

export async function listLubricants(params: { clientId?: string; active?: boolean } = {}): Promise<Lubricant[]> {
  const { data } = await api.get<Lubricant[]>("/lubrificacao/lubrificantes", { params });
  return data;
}

export async function createLubricant(input: LubricantInput): Promise<Lubricant> {
  const { data } = await api.post<Lubricant>("/lubrificacao/lubrificantes", input);
  return data;
}

export async function updateLubricant(id: string, input: Partial<LubricantInput>): Promise<Lubricant> {
  const { data } = await api.patch<Lubricant>(`/lubrificacao/lubrificantes/${id}`, input);
  return data;
}

export async function deleteLubricant(id: string): Promise<void> {
  await api.delete(`/lubrificacao/lubrificantes/${id}`);
}

// ── Pontos ───────────────────────────────────────────────────────────────────

export async function listLubricationPoints(
  params: {
    clientId?: string;
    instrumentId?: string;
    lubricantId?: string;
    routeId?: string;
    situacao?: "vencidos" | "proximos";
    search?: string;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<PagedResult<LubricationPoint>> {
  const { data } = await api.get<PagedResult<LubricationPoint>>("/lubrificacao/pontos", { params });
  return data;
}

/** Ativos marcados como lubrificaveis que ainda nao tem ponto cadastrado. */
export interface AtivoSemPonto {
  id: string;
  tag: string | null;
  description: string | null;
  type: string;
  criticality: string;
  plant: { id: string; name: string } | null;
  area: { id: string; name: string } | null;
  parent: { id: string; tag: string | null; description: string | null } | null;
}

export async function listPendingLubricationPoints(
  params: { clientId?: string; plantId?: string; areaId?: string; search?: string; page?: number; pageSize?: number } = {},
): Promise<PagedResult<AtivoSemPonto>> {
  const { data } = await api.get<PagedResult<AtivoSemPonto>>("/lubrificacao/pontos/pendentes", { params });
  return data;
}

/** Proximo codigo livre para um ponto deste ativo ("VMA-VL4-001-PT-02"). */
export async function proximoCodigoDePonto(instrumentId: string, clientId?: string): Promise<string> {
  const { data } = await api.get<{ code: string }>("/lubrificacao/pontos/proximo-codigo", {
    params: { instrumentId, clientId },
  });
  return data.code;
}

export async function getLubricationPoint(id: string): Promise<LubricationPoint> {
  const { data } = await api.get<LubricationPoint>(`/lubrificacao/pontos/${id}`);
  return data;
}

export async function createLubricationPoint(input: LubricationPointInput): Promise<LubricationPoint> {
  const { data } = await api.post<LubricationPoint>("/lubrificacao/pontos", input);
  return data;
}

export async function updateLubricationPoint(id: string, input: Partial<LubricationPointInput>): Promise<LubricationPoint> {
  const { data } = await api.patch<LubricationPoint>(`/lubrificacao/pontos/${id}`, input);
  return data;
}

export async function deleteLubricationPoint(id: string): Promise<void> {
  await api.delete(`/lubrificacao/pontos/${id}`);
}

/** Registra a aplicacao: baixa o estoque do lubrificante e reprograma o ponto. */
export async function registrarLubrificacao(pointId: string, input: LubricationRecordInput): Promise<LubricationRecord> {
  const { data } = await api.post<LubricationRecord>(`/lubrificacao/pontos/${pointId}/registros`, input);
  return data;
}

export async function listLubricationRecords(
  params: { clientId?: string; pointId?: string; lubricantId?: string; dateFrom?: string; dateTo?: string; page?: number; pageSize?: number } = {},
): Promise<PagedResult<LubricationRecord>> {
  const { data } = await api.get<PagedResult<LubricationRecord>>("/lubrificacao/registros", { params });
  return data;
}

// ── Rotas ────────────────────────────────────────────────────────────────────

export async function listLubricationRoutes(params: { clientId?: string; active?: boolean } = {}): Promise<LubricationRoute[]> {
  const { data } = await api.get<LubricationRoute[]>("/lubrificacao/rotas", { params });
  return data;
}

export async function getLubricationRoute(id: string): Promise<LubricationRoute> {
  const { data } = await api.get<LubricationRoute>(`/lubrificacao/rotas/${id}`);
  return data;
}

export async function createLubricationRoute(input: LubricationRouteInput): Promise<LubricationRoute> {
  const { data } = await api.post<LubricationRoute>("/lubrificacao/rotas", input);
  return data;
}

export async function updateLubricationRoute(id: string, input: Partial<LubricationRouteInput>): Promise<LubricationRoute> {
  const { data } = await api.patch<LubricationRoute>(`/lubrificacao/rotas/${id}`, input);
  return data;
}

export async function deleteLubricationRoute(id: string): Promise<void> {
  await api.delete(`/lubrificacao/rotas/${id}`);
}

// ── Painel e previsao ────────────────────────────────────────────────────────

export async function getLubricationDashboard(params: { clientId?: string } = {}): Promise<LubricationDashboard> {
  const { data } = await api.get<LubricationDashboard>("/lubrificacao/dashboard", { params });
  return data;
}

export async function getLubricationForecast(
  params: { clientId?: string; dateFrom?: string; dateTo?: string } = {},
): Promise<LubricationForecast> {
  const { data } = await api.get<LubricationForecast>("/lubrificacao/previsao", { params });
  return data;
}
