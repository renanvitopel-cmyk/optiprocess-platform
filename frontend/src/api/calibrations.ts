import { api } from "./client";
import type { PagedResult } from "./client";
import type {
  Calibration,
  CalibrationAttachment,
  CalibrationPoint,
  CalibrationResult,
  CalibrationStandard,
  AttachmentCategory,
} from "./types";

export interface ListCalibrationsParams {
  page?: number;
  pageSize?: number;
  clientId?: string;
  instrumentId?: string;
  search?: string;
  includeSuperseded?: boolean;
  /** Filtros usados no portal do cliente: por periodo e por resultado. */
  dateFrom?: string;
  dateTo?: string;
  result?: CalibrationResult;
}

export async function listCalibrations(params: ListCalibrationsParams = {}): Promise<PagedResult<Calibration>> {
  const { data } = await api.get<PagedResult<Calibration>>("/calibrations", { params });
  return data;
}

export async function getCalibration(id: string): Promise<Calibration> {
  const { data } = await api.get<Calibration>(`/calibrations/${id}`);
  return data;
}

export interface CalibrationHistoryEntry {
  id: string;
  certificateNumber: string;
  revisionNumber: number;
  status: string;
  calibrationDate: string;
  createdAt: string;
}

export async function getCalibrationHistory(id: string): Promise<CalibrationHistoryEntry[]> {
  const { data } = await api.get<CalibrationHistoryEntry[]>(`/calibrations/${id}/history`);
  return data;
}

export interface CalibrationInput {
  clientId: string;
  instrumentId: string;
  serviceOrderId?: string | null;
  calibrationDate: string;
  location: string;
  technicianId: string;
  standardUsed?: string | null;
  traceability?: string | null;
  procedure?: string | null;
  coverageFactorK?: number | null;
  ambientTemperature?: number | null;
  ambientHumidity?: number | null;
  environmentalNotes?: string | null;
  result: CalibrationResult;
  technicalConclusion: string;
  observations?: string | null;
  validUntil: string;
  points: CalibrationPoint[];
  standards?: CalibrationStandard[];
}

export async function createCalibration(input: CalibrationInput): Promise<Calibration> {
  const { data } = await api.post<Calibration>("/calibrations", input);
  return data;
}

export async function updateCalibration(id: string, input: Partial<CalibrationInput>): Promise<Calibration> {
  const { data } = await api.patch<Calibration>(`/calibrations/${id}`, input);
  return data;
}

export async function issueCalibration(id: string): Promise<Calibration> {
  const { data } = await api.post<Calibration>(`/calibrations/${id}/issue`);
  return data;
}

export async function reviseCalibration(id: string): Promise<Calibration> {
  const { data } = await api.post<Calibration>(`/calibrations/${id}/revise`);
  return data;
}

export async function setCalibrationVisibility(id: string, visibleToClient: boolean): Promise<Calibration> {
  const { data } = await api.patch<Calibration>(`/calibrations/${id}/visibility`, { visibleToClient });
  return data;
}

/** Regera o PDF do certificado (ex.: apos incluir ou trocar uma foto). */
export async function regenerateCertificatePdf(id: string): Promise<Calibration> {
  const { data } = await api.post<Calibration>(`/calibrations/${id}/regenerate-pdf`);
  return data;
}

export async function getCalibrationPdfUrl(id: string): Promise<string> {
  const { data } = await api.get<{ url: string }>(`/calibrations/${id}/pdf-url`);
  return data.url;
}

// --------------------------------------------------------------------------
// Registro de campo: fotos e anexos complementares
// --------------------------------------------------------------------------

export async function listCalibrationAttachments(id: string): Promise<CalibrationAttachment[]> {
  const { data } = await api.get<CalibrationAttachment[]>(`/calibrations/${id}/attachments`);
  return data;
}

export async function uploadCalibrationAttachment(
  id: string,
  file: File,
  category: AttachmentCategory,
  caption?: string,
): Promise<CalibrationAttachment> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category);
  if (caption) formData.append("caption", caption);
  const { data } = await api.post<CalibrationAttachment>(`/calibrations/${id}/attachments`, formData);
  return data;
}

export async function deleteCalibrationAttachment(id: string, attachmentId: string): Promise<void> {
  await api.delete(`/calibrations/${id}/attachments/${attachmentId}`);
}

export async function getCalibrationAttachmentUrl(id: string, attachmentId: string): Promise<string> {
  const { data } = await api.get<{ url: string }>(`/calibrations/${id}/attachments/${attachmentId}/url`);
  return data.url;
}
