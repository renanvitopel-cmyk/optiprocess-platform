import type { Request, Response } from "express";
import { z } from "zod";
import { dataOpcional, uuidOpcional } from "../../utils/zod";
import { InstrumentStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parsePageParams, toSkipTake, buildPagedResult } from "../../utils/pagination";
import { ForbiddenError, NotFoundError, ValidationError } from "../../utils/errors";
import { writeAuditLog } from "../../utils/audit";
import { clientScopeFilter, assertServiceAccess, resolveClientScope } from "../../middleware/rbac";
import { deriveDueStatus, computeNextDueDate } from "../../utils/status";
import { getStorageProvider } from "../../lib/storage";
import { assertInstrumentLimitNotExceeded } from "../../lib/planLimits";
import type { AttachmentCategory } from "@prisma/client";

/** Quando o ativo tem pontos de calibracao cadastrados (ex.: os 10 PT-100 de uma
 * extrusora), o status do ativo como um todo e' o pior entre os pontos ativos - um so
 * vencido ja basta para o ativo pedir atencao, mesmo que os outros nove estejam em dia.
 * Sem nenhum ponto cadastrado, continua valendo o nextDueDate do proprio ativo. */
function withDerivedStatus<
  T extends {
    status: InstrumentStatus;
    nextDueDate: Date | null;
    instrumentCalibrationPoints?: { nextDueDate: Date | null; active?: boolean }[];
  },
>(instrument: T) {
  if (instrument.status === "IN_MAINTENANCE") return { ...instrument, derivedStatus: "IN_MAINTENANCE" as const };

  const pontosAtivos = (instrument.instrumentCalibrationPoints ?? []).filter((p) => p.active !== false);
  if (pontosAtivos.length === 0) {
    return { ...instrument, derivedStatus: deriveDueStatus(instrument.nextDueDate) };
  }

  const ORDEM_GRAVIDADE = { EXPIRED: 2, DUE_SOON: 1, VALID: 0 } as const;
  const pior = pontosAtivos
    .map((p) => deriveDueStatus(p.nextDueDate))
    .reduce((a, b) => (ORDEM_GRAVIDADE[b] > ORDEM_GRAVIDADE[a] ? b : a), "VALID" as ReturnType<typeof deriveDueStatus>);
  return { ...instrument, derivedStatus: pior };
}

/** Troca a chave de armazenamento por um link temporario que a tela consegue exibir.
 * Assinar e' local (nao vai na rede), entao dá pra fazer isso item a item na listagem. */
async function attachPhotoUrl<T extends { photoKey: string | null; photoFileName: string | null }>(
  instruments: T[],
): Promise<(T & { photoUrl: string | null })[]> {
  const storage = getStorageProvider();
  return Promise.all(
    instruments.map(async (i) => ({
      ...i,
      photoUrl: i.photoKey ? await storage.getSignedDownloadUrl(i.photoKey, i.photoFileName ?? "foto", 3600) : null,
    })),
  );
}

export const listInstruments = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CALIBRATION"]);
  const pageParams = parsePageParams(req.query as Record<string, unknown>);
  const { clientId, search, status } = req.query as {
    clientId?: string;
    search?: string;
    status?: InstrumentStatus;
  };

  const where = {
    deletedAt: null,
    calibratable: true,
    ...resolveClientScope(req, clientId),
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { tag: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
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
        instrumentCalibrationPoints: { where: { active: true, deletedAt: null }, select: { nextDueDate: true } },
      },
    }),
    prisma.instrument.count({ where }),
  ]);

  const withPhoto = await attachPhotoUrl(items.map(withDerivedStatus));
  res.json(buildPagedResult(withPhoto, total, pageParams));
});

export const getInstrument = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CALIBRATION"]);
  const instrument = await prisma.instrument.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    include: {
      client: { select: { id: true, companyName: true, tradeName: true } },
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
      instrumentCalibrationPoints: {
        where: { deletedAt: null },
        orderBy: { sortOrder: "asc" },
        include: { measurementType: true },
      },
    },
  });
  if (!instrument) throw new NotFoundError("Instrumento");
  const [withPhoto] = await attachPhotoUrl([withDerivedStatus(instrument)]);

  res.json(withPhoto);
});

const instrumentSchema = z.object({
  // Opcional aqui porque o portal do cliente nunca envia clientId (o backend forca a
  // propria empresa do usuario); obrigatorio apenas para a equipe interna, checado abaixo.
  clientId: z.string().uuid().optional(),
  // O cadastro rapido (modoRapido no front) nao pergunta o tipo - ele entra depois, na
  // ficha do ativo. Sem valor aqui, createInstrument grava "A definir" (placeholder que a
  // ficha do ativo reconhece para pedir para completar o cadastro).
  type: z.string().min(2, "Informe o tipo do instrumento.").optional(),
  // TAG e o codigo que identifica o ativo (cadastrado pelo cliente ou pela OptiProcess) -
  // e' o que agrupa, na ficha do ativo, todas as calibracoes e ordens de servico dele.
  tag: z.string().min(1, "Informe o TAG do ativo."),
  // Nome do ativo em linguagem de gente - junto do TAG e' o que identifica nas telas.
  description: z.string().nullish(),
  // Marca o ativo como sujeito a calibracao (entra na lista da OptiProcess).
  calibratable: z.boolean().optional(),
  // Ficha do fabricante e' opcional: nem todo ativo de manutencao tem numero de serie.
  manufacturer: z.string().nullish(),
  model: z.string().nullish(),
  serialNumber: z.string().nullish(),
  measurementRange: z.string().nullish(),
  resolution: z.string().nullish(),
  unit: z.string().nullish(),
  installationLocation: z.string().nullish(),
  calibrationFrequencyMonths: z.coerce.number().int().min(1).nullish(),
  lastCalibrationDate: dataOpcional,
  status: z.nativeEnum(InstrumentStatus).optional(),
});

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
  await assertServiceAccess(req, ["CALIBRATION"]);
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
  await assertInstrumentLimitNotExceeded(clientId);
  await assertTagAvailable(clientId, data.tag);
  const nextDueDate = data.lastCalibrationDate && data.calibrationFrequencyMonths
    ? computeNextDueDate(data.lastCalibrationDate, data.calibrationFrequencyMonths)
    : null;

  const instrument = await prisma.instrument.create({
    data: {
      ...data,
      type: data.type || "A definir",
      clientId,
      nextDueDate,
      createdById: req.user?.sub,
    },
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "CREATE",
    entityType: "Instrument",
    entityId: instrument.id,
    description: `Ativo ${instrument.tag ?? instrument.type}${instrument.description ? ` - ${instrument.description}` : ""} cadastrado`,
  });

  res.status(201).json(instrument);
});

export const updateInstrument = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CALIBRATION"]);
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
    description: `Ativo ${instrument.tag ?? instrument.type}${instrument.description ? ` - ${instrument.description}` : ""} atualizado`,
  });

  res.json(instrument);
});

/**
 * O que some junto ao remover o ativo - usado na confirmacao da tela.
 *
 * Remover e' exclusao logica: nada e' apagado do banco, e o historico continua ligado ao
 * ativo. Mas ele sai das listas, e por isso a tela precisa dizer o tamanho do que esta
 * pendurado nele antes de perguntar "tem certeza?".
 */
async function impactoDaRemocao(instrumentId: string) {
  const calibracoes = await prisma.calibration.count({ where: { instrumentId, deletedAt: null } });
  return { calibracoes };
}

export const getInstrumentRemovalImpact = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CALIBRATION"]);
  const existing = await prisma.instrument.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
  });
  if (!existing) throw new NotFoundError("Ativo");
  res.json(await impactoDaRemocao(existing.id));
});

export const deleteInstrument = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.instrument.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
  });
  if (!existing) throw new NotFoundError("Instrumento");

  await prisma.instrument.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "DELETE",
    entityType: "Instrument",
    entityId: existing.id,
    description: `Ativo ${existing.tag ?? existing.type}${existing.description ? ` - ${existing.description}` : ""} removido`,
  });

  res.status(204).send();
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

/** Foto principal do ativo. Substituir apaga a anterior do armazenamento - nao faz sentido
 * acumular fotos orfas de um campo que so guarda uma. */
export const uploadInstrumentPhoto = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CALIBRATION"]);
  const existing = await prisma.instrument.findFirst({ where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) } });
  if (!existing) throw new NotFoundError("Ativo");

  const file = req.file;
  if (!file) throw new ValidationError("Selecione uma imagem.");
  if (!file.mimetype.startsWith("image/")) throw new ValidationError("A foto do ativo precisa ser uma imagem.");

  const storage = getStorageProvider();
  const key = `instruments/${existing.id}/foto-${Date.now()}-${file.originalname}`;
  await storage.upload(key, file.buffer, file.mimetype);

  const anterior = existing.photoKey;
  const instrument = await prisma.instrument.update({
    where: { id: existing.id },
    data: { photoKey: key, photoFileName: file.originalname },
  });
  if (anterior) await storage.delete(anterior).catch(() => undefined);

  const [comFoto] = await attachPhotoUrl([instrument]);
  res.status(201).json(comFoto);
});

export const deleteInstrumentPhoto = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CALIBRATION"]);
  const existing = await prisma.instrument.findFirst({ where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) } });
  if (!existing) throw new NotFoundError("Ativo");

  if (existing.photoKey) await getStorageProvider().delete(existing.photoKey).catch(() => undefined);
  await prisma.instrument.update({ where: { id: existing.id }, data: { photoKey: null, photoFileName: null } });
  res.status(204).send();
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

// ---------------------------------------------------------------------------
// Pontos de calibracao do ativo - ex.: os 10 PT-100 de uma extrusora. Cadastrado pelo
// cliente (o que precisa ser calibrado) ou pela OptiProcess; cada ponto tem seu proprio
// ciclo (lastCalibrationDate/nextDueDate), atualizado quando um certificado que o usa
// e' emitido (ver issueCalibration em calibrations/controller.ts).
// ---------------------------------------------------------------------------

function withPointDerivedStatus<T extends { nextDueDate: Date | null }>(point: T) {
  return { ...point, derivedStatus: deriveDueStatus(point.nextDueDate) };
}

export const listInstrumentCalibrationPoints = asyncHandler(async (req: Request, res: Response) => {
  const instrument = await prisma.instrument.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    select: { id: true },
  });
  if (!instrument) throw new NotFoundError("Ativo");

  const points = await prisma.instrumentCalibrationPoint.findMany({
    where: { instrumentId: instrument.id, deletedAt: null },
    orderBy: { sortOrder: "asc" },
    include: { measurementType: true },
  });
  res.json(points.map(withPointDerivedStatus));
});

const calibrationPointSchema = z.object({
  label: z.string().min(1, "Informe o nome do ponto (ex.: PT-100 - Zona 1 Canhao)."),
  // Grandeza (Temperatura, Balanca...) - decide os campos extras abaixo.
  measurementTypeId: uuidOpcional,
  measurementRange: z.string().nullish(),
  unit: z.string().nullish(),
  // MeasurementFieldProfile.TEMPERATURE
  targetTemperature: z.coerce.number().nullish(),
  tolerancePercent: z.coerce.number().nullish(),
  // MeasurementFieldProfile.SCALE (balanca)
  zeroValue: z.coerce.number().nullish(),
  spanValue: z.coerce.number().nullish(),
  calibrationFrequencyMonths: z.coerce.number().int().min(1).nullish(),
  sortOrder: z.coerce.number().int().optional(),
});

export const createInstrumentCalibrationPoint = asyncHandler(async (req: Request, res: Response) => {
  const instrument = await prisma.instrument.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    select: { id: true },
  });
  if (!instrument) throw new NotFoundError("Ativo");

  const data = calibrationPointSchema.parse(req.body);
  const point = await prisma.instrumentCalibrationPoint.create({
    data: { ...data, instrumentId: instrument.id, createdById: req.user?.sub },
    include: { measurementType: true },
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "CREATE",
    entityType: "InstrumentCalibrationPoint",
    entityId: point.id,
    description: `Ponto de calibracao "${point.label}" cadastrado`,
  });

  res.status(201).json(withPointDerivedStatus(point));
});

export const updateInstrumentCalibrationPoint = asyncHandler(async (req: Request, res: Response) => {
  const instrument = await prisma.instrument.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    select: { id: true },
  });
  if (!instrument) throw new NotFoundError("Ativo");

  const existing = await prisma.instrumentCalibrationPoint.findFirst({
    where: { id: req.params.pointId, instrumentId: instrument.id, deletedAt: null },
  });
  if (!existing) throw new NotFoundError("Ponto de calibracao");

  const data = calibrationPointSchema.partial().extend({ active: z.boolean().optional() }).parse(req.body);
  const point = await prisma.instrumentCalibrationPoint.update({
    where: { id: existing.id },
    data,
    include: { measurementType: true },
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "InstrumentCalibrationPoint",
    entityId: point.id,
    description: `Ponto de calibracao "${point.label}" atualizado`,
  });

  res.json(withPointDerivedStatus(point));
});

export const deleteInstrumentCalibrationPoint = asyncHandler(async (req: Request, res: Response) => {
  const instrument = await prisma.instrument.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    select: { id: true },
  });
  if (!instrument) throw new NotFoundError("Ativo");

  const existing = await prisma.instrumentCalibrationPoint.findFirst({
    where: { id: req.params.pointId, instrumentId: instrument.id, deletedAt: null },
  });
  if (!existing) throw new NotFoundError("Ponto de calibracao");

  // Exclusao logica: certificados que ja calibraram este ponto mantem o vinculo (a
  // linha em CalibrationPoint so' fica sem o link de volta se o FK for removido, o que
  // nao acontece aqui).
  await prisma.instrumentCalibrationPoint.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "DELETE",
    entityType: "InstrumentCalibrationPoint",
    entityId: existing.id,
    description: `Ponto de calibracao "${existing.label}" removido`,
  });

  res.status(204).send();
});
