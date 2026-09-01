import { api } from "./client";
import type { PagedResult } from "./client";
import type { Calibration, CalibrationPoint, CalibrationResult } from "./types";

export interface ListCalibrationsParams {
  page?: number;
  pageSize?: number;
  clientId?: string;
  instrumentId?: string;
  search?: string;
  includeSuperseded?: boolean;
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
  standardUsed: string;
  traceability: string;
  ambientTemperature?: number | null;
  ambientHumidity?: number | null;
  environmentalNotes?: string | null;
  result: CalibrationResult;
  technicalConclusion: string;
  validUntil: string;
  points: CalibrationPoint[];
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

export async function uploadCalibrationPdf(id: string, file: File): Promise<Calibration> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post<Calibration>(`/calibrations/${id}/pdf`, formData);
  return data;
}

export async function getCalibrationPdfUrl(id: string): Promise<string> {
  const { data } = await api.get<{ url: string }>(`/calibrations/${id}/pdf-url`);
  return data.url;
}
