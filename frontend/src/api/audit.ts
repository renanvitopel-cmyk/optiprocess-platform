import { api } from "./client";
import type { PagedResult } from "./client";
import type { AuditLogEntry } from "./types";

export interface ListAuditLogsParams {
  page?: number;
  pageSize?: number;
  entityType?: string;
  userId?: string;
}

export async function listAuditLogs(params: ListAuditLogsParams = {}): Promise<PagedResult<AuditLogEntry>> {
  const { data } = await api.get<PagedResult<AuditLogEntry>>("/audit-logs", { params });
  return data;
}
