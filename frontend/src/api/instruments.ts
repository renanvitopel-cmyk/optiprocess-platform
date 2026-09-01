import { api } from "./client";
import type { PagedResult } from "./client";
import type { Instrument, InstrumentStatus } from "./types";

export interface ListInstrumentsParams {
  page?: number;
  pageSize?: number;
  clientId?: string;
  status?: InstrumentStatus;
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

export type InstrumentInput = Partial<Omit<Instrument, "id" | "status" | "derivedStatus" | "nextDueDate" | "calibrations" | "client">>;

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
