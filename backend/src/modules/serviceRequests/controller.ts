import type { Request, Response } from "express";
import { z } from "zod";
import { MaintenancePriority, ServiceRequestStatus, MaintenanceOrderType, type AttachmentCategory } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parsePageParams, toSkipTake, buildPagedResult } from "../../utils/pagination";
import { NotFoundError, ForbiddenError, ValidationError } from "../../utils/errors";
import { writeAuditLog } from "../../utils/audit";
import { clientScopeFilter, assertServiceAccess, assertOwnClient, resolveClientId, STAFF_ROLES } from "../../middleware/rbac";
import { nextClientServiceRequestNumber, nextClientMaintenanceOrderNumber } from "../../utils/sequence";
import { getStorageProvider } from "../../lib/storage";

const detailInclude = {
  client: { select: { id: true, companyName: true, tradeName: true } },
  requestedBy: { select: { id: true, name: true } },
  triageBy: { select: { id: true, name: true } },
  area: { select: { id: true, name: true } },
  instrument: { select: { id: true, type: true, model: true, serialNumber: true, tag: true } },
  category: { select: { id: true, name: true } },
  workOrder: { select: { id: true, number: true, status: true } },
};

export const listServiceRequests = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const pageParams = parsePageParams(req.query as Record<string, unknown>);
  const { clientId, status, instrumentId, areaId, search } = req.query as {
    clientId?: string;
    status?: ServiceRequestStatus;
    instrumentId?: string;
    areaId?: string;
    search?: string;
  };

  const where = {
    deletedAt: null,
    ...clientScopeFilter(req),
    ...(clientId ? { clientId } : {}),
    ...(status ? { status } : {}),
    ...(instrumentId ? { instrumentId } : {}),
    ...(areaId ? { areaId } : {}),
    ...(search ? { number: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.serviceRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...toSkipTake(pageParams),
      include: detailInclude,
    }),
    prisma.serviceRequest.count({ where }),
  ]);

  res.json(buildPagedResult(items, total, pageParams));
});

export const getServiceRequest = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const request = await prisma.serviceRequest.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    include: detailInclude,
  });
  if (!request) throw new NotFoundError("Solicitacao de servico");
  res.json(request);
});

const requestSchema = z.object({
  clientId: z.string().uuid().optional(),
  areaId: z.string().uuid().nullish(),
  instrumentId: z.string().uuid().nullish(),
  location: z.string().nullish(),
  categoryId: z.string().uuid().nullish(),
  description: z.string().min(2, "Descreva o problema."),
  safetyImpact: z.boolean().optional(),
  qualityImpact: z.boolean().optional(),
  productionImpact: z.boolean().optional(),
  suggestedPriority: z.nativeEnum(MaintenancePriority).optional(),
});

/** Area/ativo/categoria informados precisam ser da mesma empresa da solicitacao. */
async function assertRefsBelongToClient(clientId: string, data: { areaId?: string | null; instrumentId?: string | null; categoryId?: string | null }) {
  if (data.areaId) {
    const area = await prisma.area.findFirst({ where: { id: data.areaId, deletedAt: null } });
    if (!area) throw new NotFoundError("Area");
    if (area.clientId !== clientId) throw new ValidationError("A area selecionada e' de outra empresa.");
  }
  if (data.instrumentId) {
    const instrument = await prisma.instrument.findFirst({ where: { id: data.instrumentId, deletedAt: null } });
    if (!instrument) throw new NotFoundError("Ativo");
    if (instrument.clientId !== clientId) throw new ValidationError("O ativo selecionado e' de outra empresa.");
  }
  if (data.categoryId) {
    const category = await prisma.serviceRequestCategory.findFirst({ where: { id: data.categoryId } });
    if (!category) throw new NotFoundError("Categoria de solicitacao");
    if (category.clientId && category.clientId !== clientId) throw new ValidationError("Essa categoria e' de outra empresa.");
  }
}

export const createServiceRequest = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = requestSchema.parse(req.body);
  const clientId = resolveClientId(req, data.clientId);
  await assertRefsBelongToClient(clientId, data);

  const number = await nextClientServiceRequestNumber(clientId);
  const request = await prisma.serviceRequest.create({
    data: {
      ...data,
      clientId,
      number,
      requestedById: req.user?.sub,
      createdById: req.user?.sub,
    },
    include: detailInclude,
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "CREATE",
    entityType: "ServiceRequest",
    entityId: request.id,
    description: `Solicitacao de servico ${request.number} aberta`,
  });

  res.status(201).json(request);
});

const updateSchema = requestSchema.partial();

export const updateServiceRequest = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = updateSchema.parse(req.body);
  const existing = await prisma.serviceRequest.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Solicitacao de servico");
  assertOwnClient(req, existing.clientId);

  // Depois que a triagem decide algo, so a equipe interna edita (o solicitante ja
  // relatou o problema - alterar a descricao depois de aprovada/rejeitada confundiria
  // o que foi decidido).
  const isStaff = req.user?.role && STAFF_ROLES.includes(req.user.role);
  if (!isStaff && !["OPEN", "AWAITING_INFO"].includes(existing.status)) {
    throw new ForbiddenError("Esta solicitacao ja esta em triagem ou foi decidida - nao pode mais ser editada pelo solicitante.");
  }

  if (req.user?.role === "CLIENT") delete data.clientId;
  await assertRefsBelongToClient(data.clientId ?? existing.clientId, data);

  const request = await prisma.serviceRequest.update({ where: { id: existing.id }, data, include: detailInclude });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "ServiceRequest",
    entityId: request.id,
    description: `Solicitacao de servico ${request.number} atualizada`,
  });

  res.json(request);
});

export const deleteServiceRequest = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.serviceRequest.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Solicitacao de servico");
  assertOwnClient(req, existing.clientId);
  // Uma vez convertida em OS, a solicitacao normalmente e' historico permanente - so o
  // ADMIN pode forcar a remocao (ex.: dado de teste). A OS gerada nao e' afetada, so o
  // vinculo a partir da solicitacao some.
  if (existing.status === "CONVERTED" && req.user?.role !== "ADMIN") {
    throw new ValidationError("Esta solicitacao ja virou uma OS e nao pode ser removida. So um administrador pode forcar a remocao.");
  }

  await prisma.serviceRequest.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "DELETE",
    entityType: "ServiceRequest",
    entityId: existing.id,
    description:
      existing.status === "CONVERTED"
        ? `Solicitacao de servico ${existing.number} removida por administrador (ja convertida em OS - a OS nao foi afetada)`
        : `Solicitacao de servico ${existing.number} removida`,
  });

  res.status(204).send();
});

const triageSchema = z.object({
  decision: z.enum(["approve", "request_info", "reject"]),
  notes: z.string().nullish(),
  rejectionReason: z.string().nullish(),
});

/** Triagem: decide se a solicitacao vira uma OS (Planejada), volta pro solicitante
 * (Aguardando informacao) ou e' rejeitada. So a equipe interna faz triagem. */
export const triageServiceRequest = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = triageSchema.parse(req.body);
  const existing = await prisma.serviceRequest.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Solicitacao de servico");
  assertOwnClient(req, existing.clientId);
  if (["CONVERTED", "REJECTED", "CLOSED"].includes(existing.status)) {
    throw new ValidationError("Esta solicitacao ja foi decidida.");
  }
  if (data.decision === "reject" && !data.rejectionReason) {
    throw new ValidationError("Informe o motivo da rejeicao.");
  }

  const status: ServiceRequestStatus =
    data.decision === "approve" ? "PLANNED" : data.decision === "request_info" ? "AWAITING_INFO" : "REJECTED";

  const request = await prisma.serviceRequest.update({
    where: { id: existing.id },
    data: {
      status,
      triageById: req.user?.sub,
      triageNotes: data.notes ?? existing.triageNotes,
      ...(data.decision === "reject" ? { rejectionReason: data.rejectionReason } : {}),
    },
    include: detailInclude,
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "ServiceRequest",
    entityId: request.id,
    description: `Solicitacao de servico ${request.number}: triagem (${data.decision})`,
  });

  res.json(request);
});

/** Converte uma solicitacao Planejada numa Ordem de Manutencao de verdade - fecha o
 * ciclo "Solicitacao -> Triagem -> OS" descrito no pedido do usuario. */
export const convertServiceRequest = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const existing = await prisma.serviceRequest.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Solicitacao de servico");
  assertOwnClient(req, existing.clientId);
  if (existing.status !== "PLANNED") {
    throw new ValidationError("So e' possivel gerar OS de uma solicitacao Planejada (aprovada na triagem).");
  }
  if (!existing.instrumentId) {
    throw new ValidationError("Selecione um ativo na solicitacao antes de gerar a OS.");
  }

  const number = await nextClientMaintenanceOrderNumber(existing.clientId);
  const workOrder = await prisma.maintenanceWorkOrder.create({
    data: {
      number,
      clientId: existing.clientId,
      instrumentId: existing.instrumentId,
      type: MaintenanceOrderType.CORRECTIVE,
      priority: existing.suggestedPriority,
      status: "OPEN",
      description: `${existing.number}: ${existing.description}`,
      createdById: req.user?.sub,
    },
  });

  const request = await prisma.serviceRequest.update({
    where: { id: existing.id },
    data: { status: "CONVERTED", workOrderId: workOrder.id },
    include: detailInclude,
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "ServiceRequest",
    entityId: request.id,
    description: `Solicitacao de servico ${request.number} convertida na OS ${workOrder.number}`,
  });

  res.json(request);
});

// ---------------------------------------------------------------------------
// Anexos da solicitacao (foto do problema, etc.) - mesmo padrao do ativo/OS.
// ---------------------------------------------------------------------------

async function listServiceRequestAttachments(requestId: string) {
  return prisma.attachment.findMany({
    where: { entityType: "SERVICE_REQUEST", entityId: requestId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export const listServiceRequestAttachmentsRoute = asyncHandler(async (req: Request, res: Response) => {
  const request = await prisma.serviceRequest.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    select: { id: true },
  });
  if (!request) throw new NotFoundError("Solicitacao de servico");
  res.json(await listServiceRequestAttachments(request.id));
});

export const uploadServiceRequestAttachment = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.serviceRequest.findFirst({ where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) } });
  if (!existing) throw new NotFoundError("Solicitacao de servico");

  const file = req.file;
  if (!file) throw new ValidationError("Selecione um arquivo.");

  const { category, caption } = req.body as { category?: AttachmentCategory; caption?: string };

  const key = `service-requests/${existing.id}/${Date.now()}-${file.originalname}`;
  await getStorageProvider().upload(key, file.buffer, file.mimetype);

  const attachment = await prisma.attachment.create({
    data: {
      entityType: "SERVICE_REQUEST",
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

export const deleteServiceRequestAttachment = asyncHandler(async (req: Request, res: Response) => {
  const request = await prisma.serviceRequest.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    select: { id: true },
  });
  if (!request) throw new NotFoundError("Solicitacao de servico");

  const attachment = await prisma.attachment.findFirst({
    where: { id: req.params.attachmentId, entityType: "SERVICE_REQUEST", entityId: request.id },
  });
  if (!attachment) throw new NotFoundError("Anexo");

  await getStorageProvider().delete(attachment.fileKey);
  await prisma.attachment.delete({ where: { id: attachment.id } });

  res.status(204).send();
});

export const getServiceRequestAttachmentUrl = asyncHandler(async (req: Request, res: Response) => {
  const request = await prisma.serviceRequest.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    select: { id: true },
  });
  if (!request) throw new NotFoundError("Solicitacao de servico");

  const attachment = await prisma.attachment.findFirst({
    where: { id: req.params.attachmentId, entityType: "SERVICE_REQUEST", entityId: request.id },
  });
  if (!attachment) throw new NotFoundError("Anexo");

  const url = await getStorageProvider().getSignedDownloadUrl(attachment.fileKey, attachment.fileName);
  res.json({ url });
});
