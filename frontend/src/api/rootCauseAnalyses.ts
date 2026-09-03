import { api } from "./client";
import type { PagedResult } from "./client";
import type { AttachmentCategory, CalibrationAttachment, RcaStatus, RootCauseAnalysis } from "./types";

export interface ListRcaParams {
  page?: number;
  pageSize?: number;
  clientId?: string;
  status?: RcaStatus;
  instrumentId?: string;
}

export async function listRootCauseAnalyses(params: ListRcaParams = {}): Promise<PagedResult<RootCauseAnalysis>> {
  const { data } = await api.get<PagedResult<RootCauseAnalysis>>("/root-cause-analyses", { params });
  return data;
}

export async function getRootCauseAnalysis(id: string): Promise<RootCauseAnalysis> {
  const { data } = await api.get<RootCauseAnalysis>(`/root-cause-analyses/${id}`);
  return data;
}

export interface RcaInput {
  clientId?: string;
  instrumentId?: string | null;
  workOrderId?: string | null;
  problem: string;
  participants?: string | null;
  why1?: string | null;
  why2?: string | null;
  why3?: string | null;
  why4?: string | null;
  why5?: string | null;
  rootCause?: string | null;
  correctiveActions?: string | null;
  preventiveActions?: string | null;
  responsibleId?: string | null;
  dueDate?: string | null;
  effectivenessVerifiedAt?: string | null;
  effectivenessNotes?: string | null;
  status?: RcaStatus;
}

export async function createRootCauseAnalysis(input: RcaInput): Promise<RootCauseAnalysis> {
  const { data } = await api.post<RootCauseAnalysis>("/root-cause-analyses", input);
  return data;
}

export async function updateRootCauseAnalysis(id: string, input: Partial<RcaInput>): Promise<RootCauseAnalysis> {
  const { data } = await api.patch<RootCauseAnalysis>(`/root-cause-analyses/${id}`, input);
  return data;
}

export async function deleteRootCauseAnalysis(id: string): Promise<void> {
  await api.delete(`/root-cause-analyses/${id}`);
}

export async function listRcaAttachments(id: string): Promise<CalibrationAttachment[]> {
  const { data } = await api.get<CalibrationAttachment[]>(`/root-cause-analyses/${id}/attachments`);
  return data;
}

export async function uploadRcaAttachment(
  id: string,
  file: File,
  category: AttachmentCategory,
  caption?: string,
): Promise<CalibrationAttachment> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category);
  if (caption) formData.append("caption", caption);
  const { data } = await api.post<CalibrationAttachment>(`/root-cause-analyses/${id}/attachments`, formData);
  return data;
}

export async function deleteRcaAttachment(id: string, attachmentId: string): Promise<void> {
  await api.delete(`/root-cause-analyses/${id}/attachments/${attachmentId}`);
}

export async function getRcaAttachmentUrl(id: string, attachmentId: string): Promise<string> {
  const { data } = await api.get<{ url: string }>(`/root-cause-analyses/${id}/attachments/${attachmentId}/url`);
  return data.url;
}
