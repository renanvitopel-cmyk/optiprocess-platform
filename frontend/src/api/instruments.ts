import { api } from "./client";
import type { PagedResult } from "./client";
import type { AttachmentCategory, CalibrationAttachment, Instrument, InstrumentStatus } from "./types";

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

// --------------------------------------------------------------------------
// Anexos do ativo: manual, foto do equipamento etc.
// --------------------------------------------------------------------------

export async function listInstrumentAttachments(instrumentId: string): Promise<CalibrationAttachment[]> {
  const { data } = await api.get<CalibrationAttachment[]>(`/instruments/${instrumentId}/attachments`);
  return data;
}

export async function uploadInstrumentAttachment(
  instrumentId: string,
  file: File,
  category: AttachmentCategory,
  caption?: string,
): Promise<CalibrationAttachment> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category);
  if (caption) formData.append("caption", caption);
  const { data } = await api.post<CalibrationAttachment>(`/instruments/${instrumentId}/attachments`, formData);
  return data;
}

export async function deleteInstrumentAttachment(instrumentId: string, attachmentId: string): Promise<void> {
  await api.delete(`/instruments/${instrumentId}/attachments/${attachmentId}`);
}

export async function getInstrumentAttachmentUrl(instrumentId: string, attachmentId: string): Promise<string> {
  const { data } = await api.get<{ url: string }>(`/instruments/${instrumentId}/attachments/${attachmentId}/url`);
  return data.url;
}

/** O que esta pendurado no ativo - a tela mostra antes de perguntar "tem certeza?". */
export interface ImpactoDaRemocao {
  calibracoes: number;
}

export async function getImpactoDaRemocao(id: string): Promise<ImpactoDaRemocao> {
  const { data } = await api.get<ImpactoDaRemocao>(`/instruments/${id}/impacto-da-remocao`);
  return data;
}

/** Envia (ou substitui) a foto principal do ativo. */
export async function uploadInstrumentPhoto(id: string, file: File): Promise<Instrument> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<Instrument>(`/instruments/${id}/photo`, form);
  return data;
}

export async function deleteInstrumentPhoto(id: string): Promise<void> {
  await api.delete(`/instruments/${id}/photo`);
}
