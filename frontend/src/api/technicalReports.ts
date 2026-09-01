import { api } from "./client";
import type { PagedResult } from "./client";
import type { TechnicalReport, TechnicalReportCategory } from "./types";

export interface ListTechnicalReportsParams {
  page?: number;
  pageSize?: number;
  clientId?: string;
  category?: TechnicalReportCategory;
  search?: string;
}

export async function listTechnicalReports(
  params: ListTechnicalReportsParams = {},
): Promise<PagedResult<TechnicalReport>> {
  const { data } = await api.get<PagedResult<TechnicalReport>>("/technical-reports", { params });
  return data;
}

export async function getTechnicalReport(id: string): Promise<TechnicalReport> {
  const { data } = await api.get<TechnicalReport>(`/technical-reports/${id}`);
  return data;
}

export type TechnicalReportInput = Partial<
  Omit<TechnicalReport, "id" | "number" | "createdAt" | "client" | "responsible" | "pdfAttachment" | "status">
>;

export async function createTechnicalReport(input: TechnicalReportInput): Promise<TechnicalReport> {
  const { data } = await api.post<TechnicalReport>("/technical-reports", input);
  return data;
}

export async function updateTechnicalReport(id: string, input: TechnicalReportInput): Promise<TechnicalReport> {
  const { data } = await api.patch<TechnicalReport>(`/technical-reports/${id}`, input);
  return data;
}

export async function deleteTechnicalReport(id: string): Promise<void> {
  await api.delete(`/technical-reports/${id}`);
}

export async function issueTechnicalReport(id: string): Promise<TechnicalReport> {
  const { data } = await api.post<TechnicalReport>(`/technical-reports/${id}/issue`);
  return data;
}

export async function setTechnicalReportVisibility(id: string, visibleToClient: boolean): Promise<TechnicalReport> {
  const { data } = await api.patch<TechnicalReport>(`/technical-reports/${id}/visibility`, { visibleToClient });
  return data;
}

export async function uploadTechnicalReportPdf(id: string, file: File): Promise<TechnicalReport> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post<TechnicalReport>(`/technical-reports/${id}/pdf`, formData);
  return data;
}

export async function getTechnicalReportPdfUrl(id: string): Promise<string> {
  const { data } = await api.get<{ url: string }>(`/technical-reports/${id}/pdf-url`);
  return data.url;
}
