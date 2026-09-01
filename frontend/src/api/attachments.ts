import { api } from "./client";

export type AttachmentEntityType = "SERVICE_ORDER" | "CALIBRATION" | "TECHNICAL_REPORT" | "SERVICE_CONTRACT" | "PRODUCT" | "CLIENT";

export interface Attachment {
  id: string;
  entityType: AttachmentEntityType;
  entityId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export async function listAttachments(entityType: AttachmentEntityType, entityId: string): Promise<Attachment[]> {
  const { data } = await api.get<Attachment[]>("/attachments", { params: { entityType, entityId } });
  return data;
}

export async function uploadAttachment(entityType: AttachmentEntityType, entityId: string, file: File): Promise<Attachment> {
  const formData = new FormData();
  formData.append("entityType", entityType);
  formData.append("entityId", entityId);
  formData.append("file", file);
  const { data } = await api.post<Attachment>("/attachments", formData);
  return data;
}

export async function getAttachmentUrl(id: string): Promise<string> {
  const { data } = await api.get<{ url: string }>(`/attachments/${id}/url`);
  return data.url;
}

export async function deleteAttachment(id: string): Promise<void> {
  await api.delete(`/attachments/${id}`);
}
