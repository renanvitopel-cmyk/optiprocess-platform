import type { Request, Response } from "express";
import { z } from "zod";
import { MaintenanceOrderType, MaintenancePriority, MaintenanceOrderStatus, ChecklistItemResult, AttachmentCategory, LaborHourType } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parsePageParams, toSkipTake, buildPagedResult } from "../../utils/pagination";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { writeAuditLog } from "../../utils/audit";
import { clientScopeFilter, assertServiceAccess, assertOwnClient, resolveClientId } from "../../middleware/rbac";
import { nextClientMaintenanceOrderNumber } from "../../utils/sequence";
import { applySparePartMovement, reserveSparePart, releaseSparePartReservation, consumeSparePartReservation } from "../../lib/inventory";
import { getStorageProvider } from "../../lib/storage";

const detailInclude = {
  client: { select: { id: true, companyName: true, tradeName: true } },
  instrument: { select: { id: true, type: true, model: true, serialNumber: true, tag: true } },
  plan: { select: { id: true, name: true } },
  technician: { select: { id: true, name: true } },
  failureCode: true,
  checklist: { orderBy: { sortOrder: "asc" as const } },
  partsUsed: { include: { sparePart: { select: { id: true, name: true, code: true, unit: true } } } },
  laborEntries: { include: { laborResource: { select: { id: true, name: true, type: true } } }, orderBy: { createdAt: "asc" as const } },
  thirdPartyServices: { orderBy: { createdAt: "asc" as const } },
  partReservations: {
    where: { status: "RESERVED" as const },
    include: { sparePart: { select: { id: true, name: true, code: true, unit: true } } },
    orderBy: { createdAt: "asc" as const },
  },
  stoppages: { include: { reason: { select: { id: true, name: true } } }, orderBy: { startedAt: "asc" as const } },
};

export const listMaintenanceWorkOrders = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const pageParams = parsePageParams(req.query as Record<string, unknown>);
  const { clientId, instrumentId, planId, status, type, technicianId, search } = req.query as {
    clientId?: string;
    instrumentId?: string;
    planId?: string;
    status?: MaintenanceOrderStatus;
    type?: MaintenanceOrderType;
    technicianId?: string;
    search?: string;
  };

  const where = {
    deletedAt: null,
    ...clientScopeFilter(req),
    ...(clientId ? { clientId } : {}),
    ...(instrumentId ? { instrumentId } : {}),
    ...(planId ? { planId } : {}),
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
    ...(technicianId ? { technicianId } : {}),
    ...(search ? { number: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.maintenanceWorkOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...toSkipTake(pageParams),
      include: {
        client: { select: { id: true, companyName: true, tradeName: true } },
        instrument: { select: { id: true, type: true, model: true, serialNumber: true, tag: true } },
        technician: { select: { id: true, name: true } },
      },
    }),
    prisma.maintenanceWorkOrder.count({ where }),
  ]);

  res.json(buildPagedResult(items, total, pageParams));
});

export const getMaintenanceWorkOrder = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const workOrder = await prisma.maintenanceWorkOrder.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    include: detailInclude,
  });
  if (!workOrder) throw new NotFoundError("Ordem de manutencao");
  res.json(workOrder);
});

const checklistItemInput = z.object({ description: z.string().min(1) });

const workOrderSchema = z.object({
  clientId: z.string().uuid().optional(),
  instrumentId: z.string().uuid(),
  type: z.nativeEnum(MaintenanceOrderType),
  priority: z.nativeEnum(MaintenancePriority).optional(),
  description: z.string().min(2, "Descreva o servico."),
  technicianId: z.string().uuid().nullish(),
  scheduledDate: z.coerce.date().nullish(),
  failureCodeId: z.string().uuid().nullish(),
  laborHours: z.coerce.number().nullish(),
  observations: z.string().nullish(),
  checklist: z.array(checklistItemInput).optional(),
});

/** Um codigo de falha so pode ser usado pela empresa dona dele (ou por qualquer uma,
 * quando faz parte do catalogo padrao da OptiProcess). */
async function assertFailureCodeUsable(failureCodeId: string | null | undefined, clientId: string) {
  if (!failureCodeId) return;
  const code = await prisma.failureCode.findFirst({ where: { id: failureCodeId }, select: { clientId: true } });
  if (!code) throw new NotFoundError("Codigo de falha");
  if (code.clientId && code.clientId !== clientId) {
    throw new ValidationError("Esse codigo de falha e' de outra empresa.");
  }
}

export const createMaintenanceWorkOrder = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = workOrderSchema.parse(req.body);
  const clientId = resolveClientId(req, data.clientId);

  const instrument = await prisma.instrument.findFirst({ where: { id: data.instrumentId, deletedAt: null }, select: { clientId: true } });
  if (!instrument) throw new NotFoundError("Ativo");
  if (instrument.clientId !== clientId) throw new ValidationError("Esse ativo pertence a outra empresa.");

  await assertFailureCodeUsable(data.failureCodeId, clientId);

  const number = await nextClientMaintenanceOrderNumber(clientId);
  const { checklist, ...orderData } = data;

  const workOrder = await prisma.maintenanceWorkOrder.create({
    data: {
      ...orderData,
      clientId,
      number,
      status: "OPEN",
      createdById: req.user?.sub,
      checklist: { create: (checklist ?? []).map((c, i) => ({ description: c.description, sortOrder: i })) },
    },
    include: detailInclude,
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "CREATE",
    entityType: "MaintenanceWorkOrder",
    entityId: workOrder.id,
    description: `OS ${workOrder.number} criada`,
  });

  res.status(201).json(workOrder);
});

const updateSchema = workOrderSchema.partial().extend({ status: z.nativeEnum(MaintenanceOrderStatus).optional() });

export const updateMaintenanceWorkOrder = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = updateSchema.parse(req.body);
  const existing = await prisma.maintenanceWorkOrder.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Ordem de manutencao");
  assertOwnClient(req, existing.clientId);

  await assertFailureCodeUsable(data.failureCodeId, existing.clientId);

  const { checklist, ...orderData } = data;
  if (req.user?.role === "CLIENT") delete orderData.clientId;
  const workOrder = await prisma.maintenanceWorkOrder.update({
    where: { id: existing.id },
    data: orderData,
    include: detailInclude,
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "MaintenanceWorkOrder",
    entityId: workOrder.id,
    description: `OS ${workOrder.number} atualizada`,
  });

  res.json(workOrder);
});

export const deleteMaintenanceWorkOrder = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const existing = await prisma.maintenanceWorkOrder.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Ordem de manutencao");
  assertOwnClient(req, existing.clientId);

  await prisma.maintenanceWorkOrder.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "DELETE",
    entityType: "MaintenanceWorkOrder",
    entityId: existing.id,
    description: `OS ${existing.number} removida`,
  });

  res.status(204).send();
});

export const startMaintenanceWorkOrder = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const existing = await prisma.maintenanceWorkOrder.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Ordem de manutencao");
  assertOwnClient(req, existing.clientId);
  if (existing.startedAt) throw new ValidationError("Ordem de manutencao ja foi iniciada.");

  const workOrder = await prisma.maintenanceWorkOrder.update({
    where: { id: existing.id },
    data: { startedAt: new Date(), status: "IN_PROGRESS" },
    include: detailInclude,
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "MaintenanceWorkOrder",
    entityId: workOrder.id,
    description: `OS ${workOrder.number} iniciada`,
  });

  res.json(workOrder);
});

export const completeMaintenanceWorkOrder = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const existing = await prisma.maintenanceWorkOrder.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: { checklist: true },
  });
  if (!existing) throw new NotFoundError("Ordem de manutencao");
  assertOwnClient(req, existing.clientId);
  if (existing.checklist.some((c) => c.result === "PENDING")) {
    throw new ValidationError("Resolva todos os itens do checklist antes de concluir a ordem.");
  }

  const { meterReadingAtExecution } = z
    .object({ meterReadingAtExecution: z.coerce.number().nullish() })
    .parse(req.body ?? {});

  const workOrder = await prisma.maintenanceWorkOrder.update({
    where: { id: existing.id },
    data: {
      completedAt: new Date(),
      status: "COMPLETED",
      startedAt: existing.startedAt ?? new Date(),
      ...(meterReadingAtExecution != null ? { meterReadingAtExecution } : {}),
    },
    include: detailInclude,
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "MaintenanceWorkOrder",
    entityId: workOrder.id,
    description: `OS ${workOrder.number} concluida`,
  });

  // Se a OS veio de uma Solicitacao de Servico, a conclusao da OS fecha a solicitacao -
  // e' o "conclusao da OS atualiza a SS" do fluxo pedido.
  await prisma.serviceRequest.updateMany({
    where: { workOrderId: workOrder.id, status: { notIn: ["CLOSED", "REJECTED"] } },
    data: { status: "CLOSED" },
  });

  res.json(workOrder);
});

const checklistUpdateSchema = z.object({
  result: z.nativeEnum(ChecklistItemResult).optional(),
  notes: z.string().nullish(),
});

export const updateChecklistItem = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const workOrder = await prisma.maintenanceWorkOrder.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    select: { id: true },
  });
  if (!workOrder) throw new NotFoundError("Ordem de manutencao");

  const data = checklistUpdateSchema.parse(req.body);
  const item = await prisma.maintenanceWorkOrderChecklistItem.findFirst({
    where: { id: req.params.itemId, workOrderId: workOrder.id },
  });
  if (!item) throw new NotFoundError("Item do checklist");

  const updated = await prisma.maintenanceWorkOrderChecklistItem.update({ where: { id: item.id }, data });
  res.json(updated);
});

const partSchema = z.object({
  sparePartId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  reason: z.string().nullish(),
});

export const addWorkOrderPart = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = partSchema.parse(req.body);
  const workOrder = await prisma.maintenanceWorkOrder.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
  });
  if (!workOrder) throw new NotFoundError("Ordem de manutencao");

  const sparePart = await prisma.sparePart.findFirst({ where: { id: data.sparePartId, deletedAt: null } });
  if (!sparePart) throw new NotFoundError("Peca do almoxarifado");
  if (sparePart.clientId !== workOrder.clientId) {
    throw new ValidationError("Essa peca e' do almoxarifado de outra empresa.");
  }

  const movement = await applySparePartMovement({
    sparePartId: data.sparePartId,
    type: "OUT",
    quantity: data.quantity,
    reason: data.reason ?? `Consumido na OS ${workOrder.number}`,
    maintenanceWorkOrderId: workOrder.id,
    createdById: req.user?.sub,
  });

  res.status(201).json(movement);
});

export const removeWorkOrderPart = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const workOrder = await prisma.maintenanceWorkOrder.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    select: { id: true },
  });
  if (!workOrder) throw new NotFoundError("Ordem de manutencao");

  const movement = await prisma.sparePartMovement.findFirst({
    where: { id: req.params.movementId, maintenanceWorkOrderId: workOrder.id },
  });
  if (!movement) throw new NotFoundError("Movimentacao");

  // Estorna a baixa de estoque (devolve a quantidade) e remove o registro.
  await applySparePartMovement({
    sparePartId: movement.sparePartId,
    type: "IN",
    quantity: movement.quantity,
    reason: "Estorno de peca removida da OS",
  });
  await prisma.sparePartMovement.delete({ where: { id: movement.id } });

  res.status(204).send();
});

const laborEntrySchema = z.object({
  laborResourceId: z.string().uuid(),
  hours: z.coerce.number().positive(),
  hourType: z.nativeEnum(LaborHourType).nullish(),
  startedAt: z.coerce.date().nullish(),
  endedAt: z.coerce.date().nullish(),
  notes: z.string().nullish(),
});

export const addWorkOrderLabor = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = laborEntrySchema.parse(req.body);
  const workOrder = await prisma.maintenanceWorkOrder.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
  });
  if (!workOrder) throw new NotFoundError("Ordem de manutencao");

  const laborResource = await prisma.laborResource.findFirst({ where: { id: data.laborResourceId, deletedAt: null } });
  if (!laborResource) throw new NotFoundError("Recurso de mao de obra");
  if (laborResource.clientId !== workOrder.clientId) {
    throw new ValidationError("Essa mao de obra e' de outra empresa.");
  }

  const entry = await prisma.workOrderLabor.create({
    data: {
      workOrderId: workOrder.id,
      laborResourceId: laborResource.id,
      hours: data.hours,
      hourType: data.hourType,
      startedAt: data.startedAt,
      endedAt: data.endedAt,
      notes: data.notes,
      // Snapshot do valor/hora vigente agora - preserva o custo historico mesmo que o
      // recurso mude de valor/hora depois.
      hourlyRateSnapshot: laborResource.hourlyRate,
      createdById: req.user?.sub,
    },
    include: { laborResource: { select: { id: true, name: true, type: true } } },
  });

  res.status(201).json(entry);
});

export const removeWorkOrderLabor = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const workOrder = await prisma.maintenanceWorkOrder.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    select: { id: true },
  });
  if (!workOrder) throw new NotFoundError("Ordem de manutencao");

  const entry = await prisma.workOrderLabor.findFirst({ where: { id: req.params.entryId, workOrderId: workOrder.id } });
  if (!entry) throw new NotFoundError("Lancamento de mao de obra");

  await prisma.workOrderLabor.delete({ where: { id: entry.id } });
  res.status(204).send();
});

// ---------------------------------------------------------------------------
// Servicos de terceiros (custo de fornecedor externo contratado pontualmente pra OS).
// ---------------------------------------------------------------------------

const thirdPartyServiceSchema = z.object({
  supplierName: z.string().min(2, "Informe o fornecedor."),
  description: z.string().min(2, "Descreva o servico."),
  cost: z.coerce.number().nonnegative(),
  invoiceNumber: z.string().nullish(),
  notes: z.string().nullish(),
});

export const addWorkOrderThirdPartyService = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = thirdPartyServiceSchema.parse(req.body);
  const workOrder = await prisma.maintenanceWorkOrder.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    select: { id: true },
  });
  if (!workOrder) throw new NotFoundError("Ordem de manutencao");

  const service = await prisma.workOrderThirdPartyService.create({
    data: { ...data, workOrderId: workOrder.id, createdById: req.user?.sub },
  });
  res.status(201).json(service);
});

export const removeWorkOrderThirdPartyService = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const workOrder = await prisma.maintenanceWorkOrder.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    select: { id: true },
  });
  if (!workOrder) throw new NotFoundError("Ordem de manutencao");

  const service = await prisma.workOrderThirdPartyService.findFirst({ where: { id: req.params.serviceId, workOrderId: workOrder.id } });
  if (!service) throw new NotFoundError("Servico de terceiro");

  await prisma.workOrderThirdPartyService.delete({ where: { id: service.id } });
  res.status(204).send();
});

// ---------------------------------------------------------------------------
// Reserva de material (planejamento reserva -> tecnico consome no apontamento).
// ---------------------------------------------------------------------------

const reservationSchema = z.object({
  sparePartId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
});

export const addWorkOrderReservation = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = reservationSchema.parse(req.body);
  const workOrder = await prisma.maintenanceWorkOrder.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
  });
  if (!workOrder) throw new NotFoundError("Ordem de manutencao");

  const sparePart = await prisma.sparePart.findFirst({ where: { id: data.sparePartId, deletedAt: null } });
  if (!sparePart) throw new NotFoundError("Peca do almoxarifado");
  if (sparePart.clientId !== workOrder.clientId) {
    throw new ValidationError("Essa peca e' do almoxarifado de outra empresa.");
  }

  const reservation = await reserveSparePart({
    sparePartId: data.sparePartId,
    workOrderId: workOrder.id,
    quantity: data.quantity,
    createdById: req.user?.sub,
  });
  res.status(201).json(reservation);
});

export const releaseWorkOrderReservation = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const workOrder = await prisma.maintenanceWorkOrder.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    select: { id: true },
  });
  if (!workOrder) throw new NotFoundError("Ordem de manutencao");

  const reservation = await prisma.sparePartReservation.findFirst({ where: { id: req.params.reservationId, workOrderId: workOrder.id } });
  if (!reservation) throw new NotFoundError("Reserva");

  const released = await releaseSparePartReservation(reservation.id);
  res.json(released);
});

export const consumeWorkOrderReservation = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const workOrder = await prisma.maintenanceWorkOrder.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    select: { id: true },
  });
  if (!workOrder) throw new NotFoundError("Ordem de manutencao");

  const reservation = await prisma.sparePartReservation.findFirst({ where: { id: req.params.reservationId, workOrderId: workOrder.id } });
  if (!reservation) throw new NotFoundError("Reserva");

  const movement = await consumeSparePartReservation(reservation.id, req.user?.sub);
  res.status(201).json(movement);
});

// ---------------------------------------------------------------------------
// Paradas (janela de ativo parado durante a OS).
// ---------------------------------------------------------------------------

const stoppageSchema = z.object({
  reasonId: z.string().uuid().nullish(),
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date().nullish(),
  notes: z.string().nullish(),
});

async function assertStoppageReasonUsable(reasonId: string | null | undefined, clientId: string) {
  if (!reasonId) return;
  const reason = await prisma.stoppageReason.findFirst({ where: { id: reasonId }, select: { clientId: true } });
  if (!reason) throw new NotFoundError("Motivo de parada");
  if (reason.clientId && reason.clientId !== clientId) {
    throw new ValidationError("Esse motivo de parada e' de outra empresa.");
  }
}

export const addWorkOrderStoppage = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = stoppageSchema.parse(req.body);
  const workOrder = await prisma.maintenanceWorkOrder.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
  });
  if (!workOrder) throw new NotFoundError("Ordem de manutencao");
  await assertStoppageReasonUsable(data.reasonId, workOrder.clientId);

  const stoppage = await prisma.workOrderStoppage.create({
    data: { ...data, workOrderId: workOrder.id, createdById: req.user?.sub },
    include: { reason: { select: { id: true, name: true } } },
  });
  res.status(201).json(stoppage);
});

const stoppageUpdateSchema = z.object({ endedAt: z.coerce.date().nullish(), notes: z.string().nullish() });

/** Encerra uma parada em aberto (registra o fim da janela) - a maioria das paradas
 * comeca sem saber quando vai terminar. */
export const updateWorkOrderStoppage = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = stoppageUpdateSchema.parse(req.body);
  const workOrder = await prisma.maintenanceWorkOrder.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    select: { id: true },
  });
  if (!workOrder) throw new NotFoundError("Ordem de manutencao");

  const existing = await prisma.workOrderStoppage.findFirst({ where: { id: req.params.stoppageId, workOrderId: workOrder.id } });
  if (!existing) throw new NotFoundError("Parada");

  const stoppage = await prisma.workOrderStoppage.update({
    where: { id: existing.id },
    data,
    include: { reason: { select: { id: true, name: true } } },
  });
  res.json(stoppage);
});

export const removeWorkOrderStoppage = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const workOrder = await prisma.maintenanceWorkOrder.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    select: { id: true },
  });
  if (!workOrder) throw new NotFoundError("Ordem de manutencao");

  const existing = await prisma.workOrderStoppage.findFirst({ where: { id: req.params.stoppageId, workOrderId: workOrder.id } });
  if (!existing) throw new NotFoundError("Parada");

  await prisma.workOrderStoppage.delete({ where: { id: existing.id } });
  res.status(204).send();
});

async function listWorkOrderAttachments(workOrderId: string) {
  return prisma.attachment.findMany({
    where: { entityType: "MAINTENANCE_WORK_ORDER", entityId: workOrderId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export const listWorkOrderAttachmentsRoute = asyncHandler(async (req: Request, res: Response) => {
  const workOrder = await prisma.maintenanceWorkOrder.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    select: { id: true },
  });
  if (!workOrder) throw new NotFoundError("Ordem de manutencao");
  res.json(await listWorkOrderAttachments(workOrder.id));
});

export const uploadWorkOrderAttachment = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const existing = await prisma.maintenanceWorkOrder.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
  });
  if (!existing) throw new NotFoundError("Ordem de manutencao");

  const file = req.file;
  if (!file) throw new ValidationError("Selecione um arquivo.");

  const { category, caption } = req.body as { category?: AttachmentCategory; caption?: string };

  const key = `maintenance-work-orders/${existing.id}/${Date.now()}-${file.originalname}`;
  await getStorageProvider().upload(key, file.buffer, file.mimetype);

  const attachment = await prisma.attachment.create({
    data: {
      entityType: "MAINTENANCE_WORK_ORDER",
      entityId: existing.id,
      category: category && category in AttachmentCategory ? category : "OTHER",
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

export const deleteWorkOrderAttachment = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const workOrder = await prisma.maintenanceWorkOrder.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    select: { id: true },
  });
  if (!workOrder) throw new NotFoundError("Ordem de manutencao");

  const attachment = await prisma.attachment.findFirst({
    where: { id: req.params.attachmentId, entityType: "MAINTENANCE_WORK_ORDER", entityId: workOrder.id },
  });
  if (!attachment) throw new NotFoundError("Anexo");

  await getStorageProvider().delete(attachment.fileKey);
  await prisma.attachment.delete({ where: { id: attachment.id } });

  res.status(204).send();
});

export const getWorkOrderAttachmentUrl = asyncHandler(async (req: Request, res: Response) => {
  const workOrder = await prisma.maintenanceWorkOrder.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    select: { id: true },
  });
  if (!workOrder) throw new NotFoundError("Ordem de manutencao");

  const attachment = await prisma.attachment.findFirst({
    where: { id: req.params.attachmentId, entityType: "MAINTENANCE_WORK_ORDER", entityId: workOrder.id },
  });
  if (!attachment) throw new NotFoundError("Anexo");

  const url = await getStorageProvider().getSignedDownloadUrl(attachment.fileKey, attachment.fileName);
  res.json({ url });
});

/**
 * Indicadores de manutencao (MTTR, MTBF, disponibilidade, cumprimento do plano), calculados
 * em memoria a partir das OMs do periodo - volume pequeno, sem necessidade de SQL agregado.
 */
export const getMaintenanceDashboard = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const { clientId, instrumentId, dateFrom, dateTo } = req.query as {
    clientId?: string;
    instrumentId?: string;
    dateFrom?: string;
    dateTo?: string;
  };

  const periodStart = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const periodEnd = dateTo ? new Date(dateTo) : new Date();

  const where = {
    deletedAt: null,
    ...clientScopeFilter(req),
    ...(clientId ? { clientId } : {}),
    ...(instrumentId ? { instrumentId } : {}),
    createdAt: { gte: periodStart, lte: periodEnd },
  };

  const workOrders = await prisma.maintenanceWorkOrder.findMany({
    where,
    select: { id: true, type: true, status: true, startedAt: true, completedAt: true, instrumentId: true, triggeredByMeterId: true },
  });

  const completed = workOrders.filter((w) => w.completedAt && w.startedAt);
  const corrective = workOrders.filter((w) => w.type === "CORRECTIVE" && w.completedAt && w.startedAt);

  const mttrMinutes = completed.length
    ? completed.reduce((sum, w) => sum + (w.completedAt!.getTime() - w.startedAt!.getTime()), 0) / completed.length / 60000
    : 0;

  // MTBF: intervalo medio entre conclusoes de corretivas consecutivas, por ativo.
  const byInstrument = new Map<string, Date[]>();
  for (const w of corrective) {
    const list = byInstrument.get(w.instrumentId) ?? [];
    list.push(w.completedAt!);
    byInstrument.set(w.instrumentId, list);
  }
  const gapsHours: number[] = [];
  for (const dates of byInstrument.values()) {
    const sorted = dates.sort((a, b) => a.getTime() - b.getTime());
    for (let i = 1; i < sorted.length; i++) {
      gapsHours.push((sorted[i].getTime() - sorted[i - 1].getTime()) / 3600000);
    }
  }
  const mtbfHours = gapsHours.length ? gapsHours.reduce((a, b) => a + b, 0) / gapsHours.length : 0;

  const downtimeMinutes = corrective.reduce((sum, w) => sum + (w.completedAt!.getTime() - w.startedAt!.getTime()), 0) / 60000;
  const periodMinutes = Math.max(1, (periodEnd.getTime() - periodStart.getTime()) / 60000);
  const availability = Math.max(0, 1 - downtimeMinutes / periodMinutes);

  const plans = await prisma.maintenancePlan.findMany({
    where: { deletedAt: null, active: true, ...clientScopeFilter(req), ...(clientId ? { clientId } : {}), ...(instrumentId ? { instrumentId } : {}) },
    select: { nextDueDate: true },
  });
  const now = new Date();
  const onTime = plans.filter((p) => !p.nextDueDate || p.nextDueDate >= now).length;
  const complianceRate = plans.length ? onTime / plans.length : 1;

  res.json({
    period: { from: periodStart.toISOString(), to: periodEnd.toISOString() },
    totals: {
      workOrders: workOrders.length,
      // "Aberta" aqui e' qualquer OS que ainda nao terminou (nao so o status literal
      // "OPEN") - senao o numero cai artificialmente assim que a OS avanca pra Planejada/
      // Programada/etc., escondendo trabalho que ainda esta pendente.
      open: workOrders.filter((w) => !["COMPLETED", "CANCELED"].includes(w.status)).length,
      inProgress: workOrders.filter((w) => w.status === "IN_PROGRESS").length,
      completed: workOrders.filter((w) => w.status === "COMPLETED").length,
      corrective: workOrders.filter((w) => w.type === "CORRECTIVE").length,
      preventive: workOrders.filter((w) => w.type === "PREVENTIVE").length,
      predictive: workOrders.filter((w) => w.type === "PREDICTIVE").length,
      // Quantas dessas preditivas foram abertas sozinhas por uma leitura fora da faixa
      // (em vez de escolhidas a mao) - mede se a preditiva esta funcionando de verdade.
      predictiveAutoOpened: workOrders.filter((w) => w.type === "PREDICTIVE" && w.triggeredByMeterId).length,
    },
    kpis: {
      mttrHours: Number((mttrMinutes / 60).toFixed(1)),
      mtbfHours: Number(mtbfHours.toFixed(1)),
      availabilityPct: Number((availability * 100).toFixed(1)),
      planComplianceRatePct: Number((complianceRate * 100).toFixed(1)),
    },
  });
});
