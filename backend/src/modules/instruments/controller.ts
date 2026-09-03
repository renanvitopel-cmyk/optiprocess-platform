import type { Request, Response } from "express";
import { z } from "zod";
import { InstrumentStatus, MaintenancePriority } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parsePageParams, toSkipTake, buildPagedResult } from "../../utils/pagination";
import { ForbiddenError, NotFoundError, ValidationError } from "../../utils/errors";
import { writeAuditLog } from "../../utils/audit";
import { clientScopeFilter, assertServiceAccess } from "../../middleware/rbac";
import { deriveDueStatus, computeNextDueDate } from "../../utils/status";
import { getStorageProvider } from "../../lib/storage";
import type { AttachmentCategory } from "@prisma/client";

function withDerivedStatus<T extends { status: InstrumentStatus; nextDueDate: Date | null }>(instrument: T) {
  const derived = instrument.status === "IN_MAINTENANCE" ? "IN_MAINTENANCE" : deriveDueStatus(instrument.nextDueDate);
  return { ...instrument, derivedStatus: derived };
}

export const listInstruments = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CALIBRATION", "CMMS_MAINTENANCE"]);
  const pageParams = parsePageParams(req.query as Record<string, unknown>);
  const { clientId, search, status, parentId, criticality } = req.query as {
    clientId?: string;
    search?: string;
    status?: InstrumentStatus;
    parentId?: string;
    criticality?: MaintenancePriority;
  };

  const where = {
    deletedAt: null,
    ...clientScopeFilter(req),
    ...(clientId ? { clientId } : {}),
    ...(status ? { status } : {}),
    ...(parentId ? { parentId } : {}),
    ...(criticality ? { criticality } : {}),
    ...(search
      ? {
          OR: [
            { tag: { contains: search, mode: "insensitive" as const } },
            { model: { contains: search, mode: "insensitive" as const } },
            { serialNumber: { contains: search, mode: "insensitive" as const } },
            { manufacturer: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.instrument.findMany({
      where,
      orderBy: { nextDueDate: "asc" },
      ...toSkipTake(pageParams),
      include: {
        client: { select: { id: true, companyName: true, tradeName: true } },
        parent: { select: { id: true, type: true, model: true, serialNumber: true, tag: true } },
      },
    }),
    prisma.instrument.count({ where }),
  ]);

  res.json(buildPagedResult(items.map(withDerivedStatus), total, pageParams));
});

const instrumentRefSelect = { id: true, type: true, model: true, serialNumber: true, tag: true } as const;

export const getInstrument = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CALIBRATION", "CMMS_MAINTENANCE"]);
  const instrument = await prisma.instrument.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    include: {
      client: { select: { id: true, companyName: true, tradeName: true } },
      parent: { select: instrumentRefSelect },
      children: { where: { deletedAt: null }, select: instrumentRefSelect, orderBy: { tag: "asc" } },
      calibrations: {
        where: { deletedAt: null },
        orderBy: { calibrationDate: "desc" },
        select: {
          id: true,
          certificateNumber: true,
          calibrationDate: true,
          validUntil: true,
          result: true,
          status: true,
          visibleToClient: true,
          revisionNumber: true,
        },
      },
    },
  });
  if (!instrument) throw new NotFoundError("Instrumento");
  res.json(withDerivedStatus(instrument));
});

const instrumentSchema = z.object({
  // Opcional aqui porque o portal do cliente nunca envia clientId (o backend forca a
  // propria empresa do usuario); obrigatorio apenas para a equipe interna, checado abaixo.
  clientId: z.string().uuid().optional(),
  type: z.string().min(2),
  // TAG e o codigo que identifica o ativo (cadastrado pelo cliente ou pela OptiProcess) -
  // e' o que agrupa, na ficha do ativo, todas as calibracoes e ordens de servico dele.
  tag: z.string().min(1, "Informe o TAG do ativo."),
  manufacturer: z.string().min(1),
  model: z.string().min(1),
  serialNumber: z.string().min(1),
  measurementRange: z.string().nullish(),
  resolution: z.string().nullish(),
  unit: z.string().nullish(),
  installationLocation: z.string().nullish(),
  calibrationFrequencyMonths: z.coerce.number().int().min(1).nullish(),
  lastCalibrationDate: z.coerce.date().nullish(),
  status: z.nativeEnum(InstrumentStatus).optional(),
  // Quanto uma parada deste ativo pesa pra empresa - guia prioridade de OS e estoque.
  criticality: z.nativeEnum(MaintenancePriority).optional(),
  // Arvore de ativos: um filho aponta para o ativo pai (mesmo cliente).
  parentId: z.string().uuid().nullish(),
});

/** Ativo pai precisa existir, pertencer ao mesmo cliente e nao criar um ciclo na arvore. */
async function assertValidParent(clientId: string, parentId: string, excludeId?: string): Promise<void> {
  if (parentId === excludeId) throw new ValidationError("Um ativo nao pode ser pai de si mesmo.");

  const parent = await prisma.instrument.findFirst({ where: { id: parentId, deletedAt: null } });
  if (!parent) throw new NotFoundError("Ativo pai");
  if (parent.clientId !== clientId) throw new ValidationError("O ativo pai precisa ser do mesmo cliente.");

  if (excludeId) {
    // Sobe a arvore a partir do pai escolhido: se chegar no proprio ativo, seria um ciclo.
    let cursor: string | null = parent.parentId;
    for (let i = 0; i < 50 && cursor; i++) {
      if (cursor === excludeId) throw new ValidationError("Essa escolha criaria um ciclo na arvore de ativos.");
      const next: { parentId: string | null } | null = await prisma.instrument.findUnique({
        where: { id: cursor },
        select: { parentId: true },
      });
      cursor = next?.parentId ?? null;
    }
  }
}

/** TAG e o identificador do ativo dentro da empresa cliente - nao pode repetir na mesma
 * empresa, senao duas listas de calibracoes/OS ficariam misturadas sob o mesmo codigo. */
async function assertTagAvailable(clientId: string, tag: string, excludeId?: string): Promise<void> {
  const conflict = await prisma.instrument.findFirst({
    where: {
      clientId,
      deletedAt: null,
      tag: { equals: tag, mode: "insensitive" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  if (conflict) throw new ValidationError(`Ja existe um ativo com o TAG "${tag}" cadastrado para este cliente.`);
}

export const createInstrument = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CALIBRATION", "CMMS_MAINTENANCE"]);
  const data = instrumentSchema.parse(req.body);
  // Cliente so cadastra ativo para a propria empresa - o clientId vem sempre da sessao,
  // nunca do corpo da requisicao (mesmo que o cliente tente enviar outro).
  if (req.user?.role === "CLIENT") {
    if (!req.user.clientId) throw new ForbiddenError();
    data.clientId = req.user.clientId;
  } else if (!data.clientId) {
    throw new ValidationError("Selecione o cliente.");
  }
  const clientId = data.clientId;
  await assertTagAvailable(clientId, data.tag);
  if (data.parentId) await assertValidParent(clientId, data.parentId);
  const nextDueDate = data.lastCalibrationDate && data.calibrationFrequencyMonths
    ? computeNextDueDate(data.lastCalibrationDate, data.calibrationFrequencyMonths)
    : null;

  const instrument = await prisma.instrument.create({
    data: { ...data, clientId, nextDueDate, createdById: req.user?.sub },
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "CREATE",
    entityType: "Instrument",
    entityId: instrument.id,
    description: `Instrumento ${instrument.model} (${instrument.serialNumber}) cadastrado`,
  });

  res.status(201).json(instrument);
});

export const updateInstrument = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CALIBRATION", "CMMS_MAINTENANCE"]);
  const data = instrumentSchema.partial().parse(req.body);
  const existing = await prisma.instrument.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Instrumento");

  if (req.user?.role === "CLIENT") {
    if (existing.clientId !== req.user.clientId) throw new ForbiddenError();
    delete data.clientId; // cliente nunca transfere o ativo para outra empresa
  }

  if (data.tag) {
    await assertTagAvailable(data.clientId ?? existing.clientId, data.tag, existing.id);
  }
  if (data.parentId) {
    await assertValidParent(data.clientId ?? existing.clientId, data.parentId, existing.id);
  }

  const lastCalibrationDate = data.lastCalibrationDate ?? existing.lastCalibrationDate;
  const frequency = data.calibrationFrequencyMonths ?? existing.calibrationFrequencyMonths;
  const nextDueDate =
    lastCalibrationDate && frequency ? computeNextDueDate(lastCalibrationDate, frequency) : existing.nextDueDate;

  const instrument = await prisma.instrument.update({
    where: { id: req.params.id },
    data: { ...data, nextDueDate },
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "Instrument",
    entityId: instrument.id,
    description: `Instrumento ${instrument.model} (${instrument.serialNumber}) atualizado`,
  });

  res.json(instrument);
});

export const deleteInstrument = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.instrument.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Instrumento");

  await prisma.instrument.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "DELETE",
    entityType: "Instrument",
    entityId: existing.id,
    description: `Instrumento ${existing.model} (${existing.serialNumber}) removido`,
  });

  res.status(204).send();
});

// ---------------------------------------------------------------------------
// BOM (lista de materiais): quais pecas do almoxarifado sao usadas neste ativo.
// ---------------------------------------------------------------------------

export const listAssetParts = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const instrument = await prisma.instrument.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    select: { id: true },
  });
  if (!instrument) throw new NotFoundError("Instrumento");

  const parts = await prisma.assetPart.findMany({
    where: { instrumentId: instrument.id },
    include: { sparePart: true },
    orderBy: { createdAt: "asc" },
  });
  res.json(parts);
});

const assetPartSchema = z.object({
  sparePartId: z.string().uuid(),
  notes: z.string().nullish(),
});

export const addAssetPart = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = assetPartSchema.parse(req.body);
  const instrument = await prisma.instrument.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
  });
  if (!instrument) throw new NotFoundError("Instrumento");

  const sparePart = await prisma.sparePart.findFirst({ where: { id: data.sparePartId, deletedAt: null } });
  if (!sparePart) throw new NotFoundError("Peca do almoxarifado");
  if (sparePart.clientId !== instrument.clientId) {
    throw new ValidationError("Essa peca e' do almoxarifado de outra empresa.");
  }

  const existing = await prisma.assetPart.findFirst({
    where: { instrumentId: instrument.id, sparePartId: data.sparePartId },
  });
  if (existing) throw new ValidationError("Esta peca ja esta vinculada a este ativo.");

  const link = await prisma.assetPart.create({
    data: { instrumentId: instrument.id, sparePartId: data.sparePartId, notes: data.notes },
    include: { sparePart: true },
  });
  res.status(201).json(link);
});

export const removeAssetPart = asyncHandler(async (req: Request, res: Response) => {
  const instrument = await prisma.instrument.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
  });
  if (!instrument) throw new NotFoundError("Instrumento");

  const link = await prisma.assetPart.findFirst({
    where: { id: req.params.linkId, instrumentId: instrument.id },
  });
  if (!link) throw new NotFoundError("Vinculo de peca");

  await prisma.assetPart.delete({ where: { id: link.id } });
  res.status(204).send();
});

/**
 * Historico real de consumo de pecas deste ativo - diferente do BOM (que so lista o que
 * e' COMPATIVEL), isso soma o que de fato ja foi baixado do almoxarifado nas OS deste
 * ativo, pra responder "quais spare parts esse ativo realmente usa e com que frequencia".
 */
export const getInstrumentPartsHistory = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const instrument = await prisma.instrument.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    select: { id: true },
  });
  if (!instrument) throw new NotFoundError("Instrumento");

  const movements = await prisma.sparePartMovement.findMany({
    where: { type: "OUT", maintenanceWorkOrder: { instrumentId: instrument.id, deletedAt: null } },
    include: { sparePart: { select: { id: true, name: true, code: true, unit: true } }, maintenanceWorkOrder: { select: { id: true, number: true } } },
    orderBy: { createdAt: "desc" },
  });

  const byPart = new Map<
    string,
    {
      sparePart: (typeof movements)[number]["sparePart"];
      totalQuantity: number;
      timesUsed: number;
      // Custo so soma quando o movimento tem unitCost - sem isso, fica null (opcional).
      totalCost: number | null;
      lastUsedAt: Date;
      lastWorkOrder: { id: string; number: string } | null;
    }
  >();
  for (const m of movements) {
    const movementCost = m.unitCost != null ? m.unitCost * m.quantity : null;
    const entry = byPart.get(m.sparePartId);
    if (entry) {
      entry.totalQuantity += m.quantity;
      entry.timesUsed += 1;
      if (movementCost != null) entry.totalCost = (entry.totalCost ?? 0) + movementCost;
    } else {
      byPart.set(m.sparePartId, {
        sparePart: m.sparePart,
        totalQuantity: m.quantity,
        timesUsed: 1,
        totalCost: movementCost,
        lastUsedAt: m.createdAt,
        lastWorkOrder: m.maintenanceWorkOrder ? { id: m.maintenanceWorkOrder.id, number: m.maintenanceWorkOrder.number } : null,
      });
    }
  }

  res.json([...byPart.values()].sort((a, b) => b.totalQuantity - a.totalQuantity));
});

/**
 * Gastos totais do ativo (pecas + mao de obra), somando todas as OS - o que fecha o
 * ciclo "adicionar na OS -> ver o gasto por ativo" pedido pelo cliente.
 */
export const getInstrumentCostSummary = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const instrument = await prisma.instrument.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    select: { id: true },
  });
  if (!instrument) throw new NotFoundError("Instrumento");

  const [partsMovements, laborEntries] = await Promise.all([
    prisma.sparePartMovement.findMany({
      where: { type: "OUT", maintenanceWorkOrder: { instrumentId: instrument.id, deletedAt: null } },
      select: { quantity: true, unitCost: true },
    }),
    prisma.workOrderLabor.findMany({
      where: { workOrder: { instrumentId: instrument.id, deletedAt: null } },
      select: { hours: true, hourlyRateSnapshot: true },
    }),
  ]);

  let partsCost = 0;
  let partsCostKnown = false;
  for (const m of partsMovements) {
    if (m.unitCost != null) {
      partsCost += m.unitCost * m.quantity;
      partsCostKnown = true;
    }
  }

  let laborCost = 0;
  let laborCostKnown = false;
  let totalHours = 0;
  for (const l of laborEntries) {
    totalHours += l.hours;
    if (l.hourlyRateSnapshot != null) {
      laborCost += l.hourlyRateSnapshot * l.hours;
      laborCostKnown = true;
    }
  }

  res.json({
    partsCost: partsCostKnown ? partsCost : null,
    laborCost: laborCostKnown ? laborCost : null,
    totalCost: partsCostKnown || laborCostKnown ? partsCost + laborCost : null,
    totalLaborHours: totalHours,
  });
});

// ---------------------------------------------------------------------------
// Anexos do ativo: manual, foto do equipamento, etc.
// ---------------------------------------------------------------------------

async function listInstrumentAttachments(instrumentId: string) {
  return prisma.attachment.findMany({
    where: { entityType: "INSTRUMENT", entityId: instrumentId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export const listInstrumentAttachmentsRoute = asyncHandler(async (req: Request, res: Response) => {
  const instrument = await prisma.instrument.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    select: { id: true },
  });
  if (!instrument) throw new NotFoundError("Ativo");
  res.json(await listInstrumentAttachments(instrument.id));
});

export const uploadInstrumentAttachment = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.instrument.findFirst({ where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) } });
  if (!existing) throw new NotFoundError("Ativo");

  const file = req.file;
  if (!file) throw new ValidationError("Selecione um arquivo.");

  const { category, caption } = req.body as { category?: AttachmentCategory; caption?: string };

  const key = `instruments/${existing.id}/${Date.now()}-${file.originalname}`;
  await getStorageProvider().upload(key, file.buffer, file.mimetype);

  const attachment = await prisma.attachment.create({
    data: {
      entityType: "INSTRUMENT",
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

export const deleteInstrumentAttachment = asyncHandler(async (req: Request, res: Response) => {
  const instrument = await prisma.instrument.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    select: { id: true },
  });
  if (!instrument) throw new NotFoundError("Ativo");

  const attachment = await prisma.attachment.findFirst({
    where: { id: req.params.attachmentId, entityType: "INSTRUMENT", entityId: instrument.id },
  });
  if (!attachment) throw new NotFoundError("Anexo");

  await getStorageProvider().delete(attachment.fileKey);
  await prisma.attachment.delete({ where: { id: attachment.id } });

  res.status(204).send();
});

export const getInstrumentAttachmentUrl = asyncHandler(async (req: Request, res: Response) => {
  const instrument = await prisma.instrument.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    select: { id: true },
  });
  if (!instrument) throw new NotFoundError("Ativo");

  const attachment = await prisma.attachment.findFirst({
    where: { id: req.params.attachmentId, entityType: "INSTRUMENT", entityId: instrument.id },
  });
  if (!attachment) throw new NotFoundError("Anexo");

  const url = await getStorageProvider().getSignedDownloadUrl(attachment.fileKey, attachment.fileName);
  res.json({ url });
});
