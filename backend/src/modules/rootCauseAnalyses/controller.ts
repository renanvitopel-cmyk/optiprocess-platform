import type { Request, Response } from "express";
import { z } from "zod";
import { RcaStatus, type AttachmentCategory } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parsePageParams, toSkipTake, buildPagedResult } from "../../utils/pagination";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { writeAuditLog } from "../../utils/audit";
import { clientScopeFilter, assertServiceAccess, assertOwnClient, resolveClientId } from "../../middleware/rbac";
import { getStorageProvider } from "../../lib/storage";

const detailInclude = {
  client: { select: { id: true, companyName: true, tradeName: true } },
  instrument: { select: { id: true, type: true, model: true, serialNumber: true, tag: true } },
  workOrder: { select: { id: true, number: true, status: true } },
  responsible: { select: { id: true, name: true } },
};

export const listRootCauseAnalyses = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const pageParams = parsePageParams(req.query as Record<string, unknown>);
  const { clientId, status, instrumentId } = req.query as { clientId?: string; status?: RcaStatus; instrumentId?: string };

  const where = {
    deletedAt: null,
    ...clientScopeFilter(req),
    ...(clientId ? { clientId } : {}),
    ...(status ? { status } : {}),
    ...(instrumentId ? { instrumentId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.rootCauseAnalysis.findMany({ where, orderBy: { createdAt: "desc" }, ...toSkipTake(pageParams), include: detailInclude }),
    prisma.rootCauseAnalysis.count({ where }),
  ]);

  res.json(buildPagedResult(items, total, pageParams));
});

export const getRootCauseAnalysis = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const rca = await prisma.rootCauseAnalysis.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    include: detailInclude,
  });
  if (!rca) throw new NotFoundError("Analise de causa raiz");
  res.json(rca);
});

const rcaSchema = z.object({
  clientId: z.string().uuid().optional(),
  instrumentId: z.string().uuid().nullish(),
  workOrderId: z.string().uuid().nullish(),
  problem: z.string().min(2, "Descreva o problema."),
  participants: z.string().nullish(),
  why1: z.string().nullish(),
  why2: z.string().nullish(),
  why3: z.string().nullish(),
  why4: z.string().nullish(),
  why5: z.string().nullish(),
  rootCause: z.string().nullish(),
  correctiveActions: z.string().nullish(),
  preventiveActions: z.string().nullish(),
  responsibleId: z.string().uuid().nullish(),
  dueDate: z.coerce.date().nullish(),
  effectivenessVerifiedAt: z.coerce.date().nullish(),
  effectivenessNotes: z.string().nullish(),
  status: z.nativeEnum(RcaStatus).optional(),
});

async function assertRefsBelongToClient(clientId: string, data: { instrumentId?: string | null; workOrderId?: string | null }) {
  if (data.instrumentId) {
    const instrument = await prisma.instrument.findFirst({ where: { id: data.instrumentId, deletedAt: null } });
    if (!instrument) throw new NotFoundError("Ativo");
    if (instrument.clientId !== clientId) throw new ValidationError("O ativo selecionado e' de outra empresa.");
  }
  if (data.workOrderId) {
    const workOrder = await prisma.maintenanceWorkOrder.findFirst({ where: { id: data.workOrderId, deletedAt: null } });
    if (!workOrder) throw new NotFoundError("Ordem de manutencao");
    if (workOrder.clientId !== clientId) throw new ValidationError("A OS selecionada e' de outra empresa.");
  }
}

export const createRootCauseAnalysis = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = rcaSchema.parse(req.body);
  const clientId = resolveClientId(req, data.clientId);
  await assertRefsBelongToClient(clientId, data);

  const rca = await prisma.rootCauseAnalysis.create({
    data: { ...data, clientId, createdById: req.user?.sub },
    include: detailInclude,
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "CREATE",
    entityType: "RootCauseAnalysis",
    entityId: rca.id,
    description: `RCA aberta: ${rca.problem}`,
  });

  res.status(201).json(rca);
});

const updateSchema = rcaSchema.partial();

export const updateRootCauseAnalysis = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = updateSchema.parse(req.body);
  const existing = await prisma.rootCauseAnalysis.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Analise de causa raiz");
  assertOwnClient(req, existing.clientId);
  if (req.user?.role === "CLIENT") delete data.clientId;
  await assertRefsBelongToClient(data.clientId ?? existing.clientId, data);

  const rca = await prisma.rootCauseAnalysis.update({ where: { id: existing.id }, data, include: detailInclude });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "RootCauseAnalysis",
    entityId: rca.id,
    description: `RCA atualizada: ${rca.problem}`,
  });

  res.json(rca);
});

export const deleteRootCauseAnalysis = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const existing = await prisma.rootCauseAnalysis.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Analise de causa raiz");
  assertOwnClient(req, existing.clientId);

  await prisma.rootCauseAnalysis.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "DELETE",
    entityType: "RootCauseAnalysis",
    entityId: existing.id,
    description: `RCA removida: ${existing.problem}`,
  });

  res.status(204).send();
});

// ---------------------------------------------------------------------------
// Anexos da RCA (evidencia fotografica, laudo, etc.) - mesmo padrao ja usado em
// ativo/OS/solicitacao de servico.
// ---------------------------------------------------------------------------

async function listRcaAttachments(rcaId: string) {
  return prisma.attachment.findMany({
    where: { entityType: "ROOT_CAUSE_ANALYSIS", entityId: rcaId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export const listRcaAttachmentsRoute = asyncHandler(async (req: Request, res: Response) => {
  const rca = await prisma.rootCauseAnalysis.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    select: { id: true },
  });
  if (!rca) throw new NotFoundError("Analise de causa raiz");
  res.json(await listRcaAttachments(rca.id));
});

export const uploadRcaAttachment = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.rootCauseAnalysis.findFirst({ where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) } });
  if (!existing) throw new NotFoundError("Analise de causa raiz");

  const file = req.file;
  if (!file) throw new ValidationError("Selecione um arquivo.");

  const { category, caption } = req.body as { category?: AttachmentCategory; caption?: string };

  const key = `rca/${existing.id}/${Date.now()}-${file.originalname}`;
  await getStorageProvider().upload(key, file.buffer, file.mimetype);

  const attachment = await prisma.attachment.create({
    data: {
      entityType: "ROOT_CAUSE_ANALYSIS",
      entityId: existing.id,
      category: category && ["LOCATION", "INSTRUMENT", "STANDARD", "MEASUREMENT", "DOCUMENT", "OTHER"].includes(category) ? category : "OTHER",
      caption: caption || null,
      fileKey: key,
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      uploadedById: req.user?.sub,
    },
  });

  res.status(201).json(attachment);
});

export const deleteRcaAttachment = asyncHandler(async (req: Request, res: Response) => {
  const rca = await prisma.rootCauseAnalysis.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    select: { id: true },
  });
  if (!rca) throw new NotFoundError("Analise de causa raiz");

  const attachment = await prisma.attachment.findFirst({
    where: { id: req.params.attachmentId, entityType: "ROOT_CAUSE_ANALYSIS", entityId: rca.id },
  });
  if (!attachment) throw new NotFoundError("Anexo");

  await getStorageProvider().delete(attachment.fileKey);
  await prisma.attachment.delete({ where: { id: attachment.id } });

  res.status(204).send();
});

export const getRcaAttachmentUrl = asyncHandler(async (req: Request, res: Response) => {
  const rca = await prisma.rootCauseAnalysis.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    select: { id: true },
  });
  if (!rca) throw new NotFoundError("Analise de causa raiz");

  const attachment = await prisma.attachment.findFirst({
    where: { id: req.params.attachmentId, entityType: "ROOT_CAUSE_ANALYSIS", entityId: rca.id },
  });
  if (!attachment) throw new NotFoundError("Anexo");

  const url = await getStorageProvider().getSignedDownloadUrl(attachment.fileKey, attachment.fileName);
  res.json({ url });
});
