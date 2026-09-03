import { api } from "./client";
import type { PagedResult } from "./client";
import type { AssetPart, AssetPartHistoryEntry, Instrument, InstrumentStatus, MaintenancePriority } from "./types";

export interface ListInstrumentsParams {
  page?: number;
  pageSize?: number;
  clientId?: string;
  status?: InstrumentStatus;
  parentId?: string;
  criticality?: MaintenancePriority;
  search?: string;
}

export async function listInstruments(params: ListInstrumentsParams = {}): Promise<PagedResult<Instrument>> {
  const { data } = await api.get<PagedResult<Instrument>>("/instruments", { params });
  return data;
}

export async function getInstrument(id: string): Promise<Instrument> {
  const { data } = await api.get<Instrument>(`/instruments/${id}`);
  return data;
}

export type InstrumentInput = Partial<
  Omit<Instrument, "id" | "status" | "derivedStatus" | "nextDueDate" | "calibrations" | "client" | "parent" | "children">
>;

export async function createInstrument(input: InstrumentInput): Promise<Instrument> {
  const { data } = await api.post<Instrument>("/instruments", input);
  return data;
}

export async function updateInstrument(id: string, input: InstrumentInput): Promise<Instrument> {
  const { data } = await api.patch<Instrument>(`/instruments/${id}`, input);
  return data;
}

export async function deleteInstrument(id: string): Promise<void> {
  await api.delete(`/instruments/${id}`);
}

// --------------------------------------------------------------------------
// BOM (lista de materiais): pecas do almoxarifado usadas no ativo
// --------------------------------------------------------------------------

export async function listAssetParts(instrumentId: string): Promise<AssetPart[]> {
  const { data } = await api.get<AssetPart[]>(`/instruments/${instrumentId}/parts`);
  return data;
}

export async function addAssetPart(instrumentId: string, sparePartId: string, notes?: string): Promise<AssetPart> {
  const { data } = await api.post<AssetPart>(`/instruments/${instrumentId}/parts`, { sparePartId, notes });
  return data;
}

export async function removeAssetPart(instrumentId: string, linkId: string): Promise<void> {
  await api.delete(`/instruments/${instrumentId}/parts/${linkId}`);
}

/** Consumo real (o que ja foi baixado do almoxarifado nas OS deste ativo) - diferente do BOM. */
export async function getInstrumentPartsHistory(instrumentId: string): Promise<AssetPartHistoryEntry[]> {
  const { data } = await api.get<AssetPartHistoryEntry[]>(`/instruments/${instrumentId}/parts-history`);
  return data;
}
