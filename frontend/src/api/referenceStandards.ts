import { api } from "./client";

export type CertificationStatus = "VALID" | "DUE_SOON" | "EXPIRED" | "NO_CERTIFICATE";

export interface ReferenceStandardCertificate {
  id: string;
  referenceStandardId: string;
  certificateNumber: string | null;
  laboratory: string | null;
  calibrationDate: string;
  validUntil: string;
  fileKey: string | null;
  fileFileName: string | null;
  notes: string | null;
  createdById: string | null;
  createdAt: string;
}

export interface ReferenceStandard {
  id: string;
  description: string;
  type: string | null;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  measurementRange: string | null;
  resolution: string | null;
  unit: string | null;
  photoKey: string | null;
  photoFileName: string | null;
  photoUrl: string | null;
  active: boolean;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  certificationStatus: CertificationStatus;
  certificates?: ReferenceStandardCertificate[];
}

export interface ListReferenceStandardsParams {
  active?: boolean;
  search?: string;
}

export async function listReferenceStandards(params: ListReferenceStandardsParams = {}): Promise<ReferenceStandard[]> {
  const { data } = await api.get<ReferenceStandard[]>("/reference-standards", { params });
  return data;
}

export async function getReferenceStandard(id: string): Promise<ReferenceStandard> {
  const { data } = await api.get<ReferenceStandard>(`/reference-standards/${id}`);
  return data;
}

export type ReferenceStandardInput = Partial<
  Omit<ReferenceStandard, "id" | "photoKey" | "photoFileName" | "photoUrl" | "createdById" | "createdAt" | "updatedAt" | "certificationStatus" | "certificates">
>;

export async function createReferenceStandard(input: ReferenceStandardInput): Promise<ReferenceStandard> {
  const { data } = await api.post<ReferenceStandard>("/reference-standards", input);
  return data;
}

export async function updateReferenceStandard(id: string, input: ReferenceStandardInput): Promise<ReferenceStandard> {
  const { data } = await api.patch<ReferenceStandard>(`/reference-standards/${id}`, input);
  return data;
}

export async function deleteReferenceStandard(id: string): Promise<void> {
  await api.delete(`/reference-standards/${id}`);
}

export async function uploadReferenceStandardPhoto(id: string, file: File): Promise<ReferenceStandard> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<ReferenceStandard>(`/reference-standards/${id}/photo`, form);
  return data;
}

export async function deleteReferenceStandardPhoto(id: string): Promise<void> {
  await api.delete(`/reference-standards/${id}/photo`);
}

export interface ReferenceStandardCertificateInput {
  certificateNumber?: string | null;
  laboratory?: string | null;
  calibrationDate: string;
  validUntil: string;
  notes?: string | null;
  file?: File | null;
}

export async function listReferenceStandardCertificates(id: string): Promise<ReferenceStandardCertificate[]> {
  const { data } = await api.get<ReferenceStandardCertificate[]>(`/reference-standards/${id}/certificates`);
  return data;
}

export async function createReferenceStandardCertificate(
  id: string,
  input: ReferenceStandardCertificateInput,
): Promise<ReferenceStandardCertificate> {
  const form = new FormData();
  if (input.certificateNumber) form.append("certificateNumber", input.certificateNumber);
  if (input.laboratory) form.append("laboratory", input.laboratory);
  form.append("calibrationDate", input.calibrationDate);
  form.append("validUntil", input.validUntil);
  if (input.notes) form.append("notes", input.notes);
  if (input.file) form.append("file", input.file);
  const { data } = await api.post<ReferenceStandardCertificate>(`/reference-standards/${id}/certificates`, form);
  return data;
}

export async function deleteReferenceStandardCertificate(id: string, certificateId: string): Promise<void> {
  await api.delete(`/reference-standards/${id}/certificates/${certificateId}`);
}

export async function getReferenceStandardCertificateUrl(id: string, certificateId: string): Promise<string> {
  const { data } = await api.get<{ url: string }>(`/reference-standards/${id}/certificates/${certificateId}/url`);
  return data.url;
}
