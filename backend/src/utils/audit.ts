import { prisma } from "../lib/prisma";
import type { Prisma } from "@prisma/client";

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "APPROVE" | "PUBLISH" | "HIDE" | "LOGIN";

export interface AuditEntry {
  userId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  description?: string;
  metadata?: Prisma.InputJsonValue;
}

/** Registra uma acao relevante para trilha de auditoria. Nunca lanca erro para o chamador. */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        description: entry.description,
        metadata: entry.metadata,
      },
    });
  } catch (error) {
    console.error("Falha ao gravar audit log", error);
  }
}
