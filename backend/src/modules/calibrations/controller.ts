import type { Request, Response } from "express";
import { z } from "zod";
import { CalibrationResult, PointResult, DocumentStatus, AttachmentCategory } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parsePageParams, toSkipTake, buildPagedResult } from "../../utils/pagination";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { writeAuditLog } from "../../utils/audit";
import { clientScopeFilter, assertServiceAccess } from "../../middleware/rbac";
import { nextDocumentNumber } from "../../utils/sequence";
import { computeNextDueDate } from "../../utils/status";
import { generateCertificateQrCode } from "../../lib/qrcode";
import { getStorageProvider } from "../../lib/storage";
import { buildCertificatePdf, defaultLogoPath, CATEGORY_LABELS } from "../../lib/certificatePdf";
import { COMPANY_INFO } from "../../config/company";

const detailInclude = {
  client: { select: { id: true, companyName: true, tradeName: true } },
  instrument: true,
  technician: { select: { id: true, name: true } },
  points: { orderBy: { sortOrder: "asc" as const } },
  standards: { orderBy: { sortOrder: "asc" as const } },
  pdfAttachment: { select: { id: true, fileName: true, mimeType: true, sizeBytes: true } },
  serviceOrder: { select: { id: true, number: true } },
};

/** Fotos e anexos de uma calibracao, na ordem em que devem aparecer no certificado. */
async function listCalibrationAttachments(calibrationId: string) {
  return prisma.attachment.findMany({
    where: { entityType: "CALIBRATION", entityId: calibrationId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export const listCalibrations = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CALIBRATION"]);
  const pageParams = parsePageParams(req.query as Record<string, unknown>);
  const { clientId, instrumentId, search, includeSuperseded, dateFrom, dateTo, result } = req.query as {
    clientId?: string;
    instrumentId?: string;
    search?: string;
    includeSuperseded?: string;
    dateFrom?: string;
    dateTo?: string;
    result?: CalibrationResult;
  };

  const isClientUser = req.user?.role === "CLIENT";

  // Filtro por periodo da calibracao (o portal do cliente usa para "buscar por data").
  const dateRange: { gte?: Date; lte?: Date } = {};
  if (dateFrom) dateRange.gte = new Date(dateFrom);
  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    dateRange.lte = end;
  }

  const where = {
    deletedAt: null,
    ...clientScopeFilter(req),
    ...(clientId ? { clientId } : {}),
    ...(instrumentId ? { instrumentId } : {}),
    ...(result ? { result } : {}),
    ...(Object.keys(dateRange).length > 0 ? { calibrationDate: dateRange } : {}),
    ...(includeSuperseded === "true" ? {} : { supersededBy: null }),
    ...(isClientUser ? { visibleToClient: true, status: "ISSUED" as const } : {}),
    ...(search ? { certificateNumber: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.calibration.findMany({
      where,
      orderBy: { calibrationDate: "desc" },
      ...toSkipTake(pageParams),
      include: {
        client: { select: { id: true, companyName: true, tradeName: true } },
        instrument: { select: { id: true, type: true, model: true, serialNumber: true, tag: true } },
      },
    }),
    prisma.calibration.count({ where }),
  ]);

  res.json(buildPagedResult(items, total, pageParams));
});

export const getCalibration = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CALIBRATION"]);
  const isClientUser = req.user?.role === "CLIENT";
  const calibration = await prisma.calibration.findFirst({
    where: {
      id: req.params.id,
      deletedAt: null,
      ...clientScopeFilter(req),
      ...(isClientUser ? { visibleToClient: true, status: "ISSUED" as const } : {}),
    },
    include: detailInclude,
  });
  if (!calibration) throw new NotFoundError("Certificado de calibracao");

  const qr = await generateCertificateQrCode(calibration.qrCodeToken);
  res.json({ ...calibration, qrCodeUrl: qr.url, qrCodeDataUrl: qr.dataUrl });
});

export const getCalibrationHistory = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CALIBRATION"]);
  const current = await prisma.calibration.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
  });
  if (!current) throw new NotFoundError("Certificado de calibracao");

  // Volta ate a primeira revisao
  let rootId = current.id;
  let cursor = current;
  for (let i = 0; i < 20 && cursor.previousRevisionId; i++) {
    const prev = await prisma.calibration.findUnique({ where: { id: cursor.previousRevisionId } });
    if (!prev) break;
    rootId = prev.id;
    cursor = prev;
  }

  // Percorre para a frente coletando toda a cadeia a partir da raiz
  interface HistoryNode {
    id: string;
    certificateNumber: string;
    revisionNumber: number;
    status: DocumentStatus;
    calibrationDate: Date;
    createdAt: Date;
    supersededBy: { id: string } | null;
  }

  const chain: HistoryNode[] = [];
  let nodeId: string | null = rootId;
  for (let i = 0; i < 20 && nodeId; i++) {
    const node: HistoryNode | null = await prisma.calibration.findUnique({
      where: { id: nodeId },
      select: {
        id: true,
        certificateNumber: true,
        revisionNumber: true,
        status: true,
        calibrationDate: true,
        createdAt: true,
        supersededBy: { select: { id: true } },
      },
    });
    if (!node) break;
    chain.push(node);
    nodeId = node.supersededBy?.id ?? null;
  }

  res.json(chain);
});

const pointSchema = z.object({
  standardValue: z.coerce.number(),
  indicatedValue: z.coerce.number(),
  error: z.coerce.number(),
  tolerance: z.coerce.number(),
  uncertainty: z.coerce.number(),
  result: z.nativeEnum(PointResult),
});

const standardSchema = z.object({
  description: z.string().min(1, "Descreva o padrao utilizado."),
  manufacturer: z.string().nullish(),
  model: z.string().nullish(),
  serialNumber: z.string().nullish(),
  certificateNumber: z.string().nullish(),
  certificateValidUntil: z.coerce.date().nullish(),
  laboratory: z.string().nullish(),
});

const calibrationSchema = z.object({
  clientId: z.string().uuid(),
  instrumentId: z.string().uuid(),
  serviceOrderId: z.string().uuid().nullish(),
  calibrationDate: z.coerce.date(),
  location: z.string().min(1),
  technicianId: z.string().uuid(),
  standardUsed: z.string().nullish(),
  traceability: z.string().nullish(),
  procedure: z.string().nullish(),
  coverageFactorK: z.coerce.number().nullish(),
  ambientTemperature: z.coerce.number().nullish(),
  ambientHumidity: z.coerce.number().nullish(),
  environmentalNotes: z.string().nullish(),
  result: z.nativeEnum(CalibrationResult),
  technicalConclusion: z.string().min(1),
  observations: z.string().nullish(),
  validUntil: z.coerce.date(),
  points: z.array(pointSchema).min(1, "Inclua ao menos um ponto calibrado."),
  standards: z.array(standardSchema).optional(),
});

export const createCalibration = asyncHandler(async (req: Request, res: Response) => {
  const data = calibrationSchema.parse(req.body);

  const instrument = await prisma.instrument.findFirst({ where: { id: data.instrumentId, deletedAt: null } });
  if (!instrument) throw new NotFoundError("Instrumento");

  const certificateNumber = await nextDocumentNumber("calibration", data.calibrationDate);

  const calibration = await prisma.calibration.create({
    data: {
      certificateNumber,
      clientId: data.clientId,
      instrumentId: data.instrumentId,
      serviceOrderId: data.serviceOrderId ?? null,
      calibrationDate: data.calibrationDate,
      location: data.location,
      technicianId: data.technicianId,
      standardUsed: data.standardUsed,
      traceability: data.traceability,
      procedure: data.procedure,
      coverageFactorK: data.coverageFactorK ?? 2,
      ambientTemperature: data.ambientTemperature ?? null,
      ambientHumidity: data.ambientHumidity ?? null,
      environmentalNotes: data.environmentalNotes,
      result: data.result,
      technicalConclusion: data.technicalConclusion,
      observations: data.observations,
      validUntil: data.validUntil,
      createdById: req.user?.sub,
      points: { create: data.points.map((p, index) => ({ ...p, sortOrder: index })) },
      standards: data.standards?.length
        ? { create: data.standards.map((s, index) => ({ ...s, sortOrder: index })) }
        : undefined,
    },
    include: detailInclude,
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "CREATE",
    entityType: "Calibration",
    entityId: calibration.id,
    description: `Certificado ${calibration.certificateNumber} criado (rascunho)`,
  });

  res.status(201).json(calibration);
});

export const updateCalibration = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.calibration.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Certificado de calibracao");
  if (existing.status === "ISSUED") {
    throw new ValidationError("Certificado ja emitido nao pode ser editado. Crie uma nova revisao.");
  }

  const data = calibrationSchema.partial().parse(req.body);
  const { points, standards, ...rest } = data;

  const calibration = await prisma.calibration.update({
    where: { id: existing.id },
    data: {
      ...rest,
      ...(points
        ? {
            points: {
              deleteMany: {},
              create: points.map((p, index) => ({ ...p, sortOrder: index })),
            },
          }
        : {}),
      ...(standards
        ? {
            standards: {
              deleteMany: {},
              create: standards.map((s, index) => ({ ...s, sortOrder: index })),
            },
          }
        : {}),
    },
    include: detailInclude,
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "Calibration",
    entityId: calibration.id,
    description: `Certificado ${calibration.certificateNumber} (rascunho) atualizado`,
  });

  res.json(calibration);
});

/**
 * Emite o certificado: a plataforma gera o PDF (com dados, padroes, pontos,
 * QR Code e o registro fotografico), grava no storage e trava o documento -
 * a partir dai so uma nova revisao pode alterar o conteudo.
 */
export const issueCalibration = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.calibration.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: detailInclude,
  });
  if (!existing) throw new NotFoundError("Certificado de calibracao");
  if (existing.status === "ISSUED") throw new ValidationError("Certificado ja esta emitido.");
  if (existing.points.length === 0) {
    throw new ValidationError("Inclua ao menos um ponto calibrado antes de emitir o certificado.");
  }

  const issuedAt = new Date();
  const pdfAttachment = await generateAndStoreCertificate(existing.id, issuedAt, req.user?.sub);

  const instrument = await prisma.instrument.findUniqueOrThrow({ where: { id: existing.instrumentId } });
  // Sem periodicidade cadastrada (ativo so de CMMS, sem calibracao recorrente), o certificado
  // ainda pode ser emitido - so nao ha proxima data derivada automaticamente.
  const nextDueDate = instrument.calibrationFrequencyMonths
    ? computeNextDueDate(existing.calibrationDate, instrument.calibrationFrequencyMonths)
    : null;

  const [calibration] = await prisma.$transaction([
    prisma.calibration.update({
      where: { id: existing.id },
      data: { status: "ISSUED", issuedAt, pdfAttachmentId: pdfAttachment.id },
      include: detailInclude,
    }),
    prisma.instrument.update({
      where: { id: existing.instrumentId },
      data: { lastCalibrationDate: existing.calibrationDate, nextDueDate, status: "VALID" },
    }),
  ]);

  await writeAuditLog({
    userId: req.user?.sub,
    action: "PUBLISH",
    entityType: "Calibration",
    entityId: calibration.id,
    description: `Certificado ${calibration.certificateNumber} emitido (PDF gerado pela plataforma)`,
  });

  res.json(calibration);
});

/** Regera o PDF de um certificado ja emitido (ex.: depois de trocar uma foto). */
export const regenerateCertificatePdf = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.calibration.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Certificado de calibracao");

  const pdfAttachment = await generateAndStoreCertificate(
    existing.id,
    existing.issuedAt ?? new Date(),
    req.user?.sub,
  );

  const calibration = await prisma.calibration.update({
    where: { id: existing.id },
    data: { pdfAttachmentId: pdfAttachment.id },
    include: detailInclude,
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "Calibration",
    entityId: calibration.id,
    description: `PDF do certificado ${calibration.certificateNumber} regerado`,
  });

  res.json(calibration);
});

/** Monta o PDF do certificado, sobe para o storage e devolve o Attachment criado. */
async function generateAndStoreCertificate(calibrationId: string, issuedAt: Date, userId?: string) {
  const cal = await prisma.calibration.findUniqueOrThrow({
    where: { id: calibrationId },
    include: {
      client: true,
      instrument: true,
      technician: { select: { id: true, name: true } },
      points: { orderBy: { sortOrder: "asc" } },
      standards: { orderBy: { sortOrder: "asc" } },
    },
  });

  const storage = getStorageProvider();

  // So imagens entram no anexo fotografico; PDFs complementares ficam de fora.
  const attachments = await listCalibrationAttachments(calibrationId);
  const photoRecords = attachments.filter((a) => a.mimeType.startsWith("image/"));
  const photos: { buffer: Buffer; caption: string }[] = [];
  for (const p of photoRecords) {
    try {
      photos.push({
        buffer: await storage.download(p.fileKey),
        caption: p.caption || CATEGORY_LABELS[p.category] || p.fileName,
      });
    } catch (error) {
      // Uma foto ilegivel nao pode impedir a emissao do certificado.
      console.error(`Falha ao ler foto ${p.fileKey} do certificado ${cal.certificateNumber}`, error);
    }
  }

  const qr = await generateCertificateQrCode(cal.qrCodeToken);
  const pdf = await buildCertificatePdf({
    calibration: { ...cal, issuedAt },
    photos,
    qrCodeDataUrl: qr.dataUrl,
    validationUrl: qr.url,
    company: COMPANY_INFO,
    logoPath: defaultLogoPath(),
  });

  const fileName = `${cal.certificateNumber}.pdf`;
  const key = `calibrations/${cal.id}/certificado-${Date.now()}.pdf`;
  await storage.upload(key, pdf, "application/pdf");

  return prisma.attachment.create({
    data: {
      entityType: "CALIBRATION",
      entityId: cal.id,
      category: "DOCUMENT",
      caption: "Certificado de calibracao",
      fileKey: key,
      fileName,
      mimeType: "application/pdf",
      sizeBytes: pdf.byteLength,
      uploadedById: userId,
    },
  });
}

export const reviseCalibration = asyncHandler(async (req: Request, res: Response) => {
  const original = await prisma.calibration.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: { points: true },
  });
  if (!original) throw new NotFoundError("Certificado de calibracao");
  if (original.status !== "ISSUED") {
    throw new ValidationError("Somente certificados emitidos podem receber uma nova revisao.");
  }

  const alreadySuperseded = await prisma.calibration.findUnique({ where: { previousRevisionId: original.id } });
  if (alreadySuperseded) throw new ValidationError("Este certificado ja possui uma revisao mais recente.");

  const baseNumber = original.certificateNumber.replace(/-R\d+$/, "");
  const revisionNumber = original.revisionNumber + 1;

  const revised = await prisma.calibration.create({
    data: {
      certificateNumber: `${baseNumber}-R${revisionNumber}`,
      clientId: original.clientId,
      instrumentId: original.instrumentId,
      serviceOrderId: original.serviceOrderId,
      calibrationDate: original.calibrationDate,
      location: original.location,
      technicianId: original.technicianId,
      standardUsed: original.standardUsed,
      traceability: original.traceability,
      ambientTemperature: original.ambientTemperature,
      ambientHumidity: original.ambientHumidity,
      environmentalNotes: original.environmentalNotes,
      result: original.result,
      technicalConclusion: original.technicalConclusion,
      validUntil: original.validUntil,
      revisionNumber,
      previousRevisionId: original.id,
      createdById: req.user?.sub,
      points: {
        create: original.points.map((p, index) => ({
          standardValue: p.standardValue,
          indicatedValue: p.indicatedValue,
          error: p.error,
          tolerance: p.tolerance,
          uncertainty: p.uncertainty,
          result: p.result,
          sortOrder: index,
        })),
      },
    },
    include: detailInclude,
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "CREATE",
    entityType: "Calibration",
    entityId: revised.id,
    description: `Revisao ${revisionNumber} criada a partir de ${original.certificateNumber}`,
  });

  res.status(201).json(revised);
});

export const setCalibrationVisibility = asyncHandler(async (req: Request, res: Response) => {
  const visible = Boolean((req.body as { visibleToClient?: boolean }).visibleToClient);
  const existing = await prisma.calibration.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Certificado de calibracao");

  const calibration = await prisma.calibration.update({
    where: { id: existing.id },
    data: { visibleToClient: visible },
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: visible ? "PUBLISH" : "HIDE",
    entityType: "Calibration",
    entityId: calibration.id,
    description: visible ? "Liberado para o portal do cliente" : "Ocultado do portal do cliente",
  });

  res.json(calibration);
});

/**
 * Registro de campo do tecnico: fotos do local, do instrumento, do padrao e das
 * leituras, alem de anexos complementares. As imagens entram automaticamente no
 * anexo fotografico do certificado gerado.
 */
export const uploadCalibrationAttachment = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.calibration.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Certificado de calibracao");

  const file = req.file;
  if (!file) throw new ValidationError("Selecione um arquivo.");

  const { category, caption } = req.body as { category?: AttachmentCategory; caption?: string };

  const key = `calibrations/${existing.id}/${Date.now()}-${file.originalname}`;
  await getStorageProvider().upload(key, file.buffer, file.mimetype);

  const attachment = await prisma.attachment.create({
    data: {
      entityType: "CALIBRATION",
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

export const listCalibrationAttachmentsRoute = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CALIBRATION"]);
  const isClientUser = req.user?.role === "CLIENT";
  const calibration = await prisma.calibration.findFirst({
    where: {
      id: req.params.id,
      deletedAt: null,
      ...clientScopeFilter(req),
      ...(isClientUser ? { visibleToClient: true, status: "ISSUED" as const } : {}),
    },
    select: { id: true },
  });
  if (!calibration) throw new NotFoundError("Certificado de calibracao");

  res.json(await listCalibrationAttachments(calibration.id));
});

export const deleteCalibrationAttachment = asyncHandler(async (req: Request, res: Response) => {
  const calibration = await prisma.calibration.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!calibration) throw new NotFoundError("Certificado de calibracao");

  const attachment = await prisma.attachment.findFirst({
    where: { id: req.params.attachmentId, entityType: "CALIBRATION", entityId: calibration.id },
  });
  if (!attachment) throw new NotFoundError("Anexo");
  if (calibration.pdfAttachmentId === attachment.id) {
    throw new ValidationError("Este e o certificado gerado e nao pode ser removido. Regere o PDF se precisar atualiza-lo.");
  }

  await getStorageProvider().delete(attachment.fileKey);
  await prisma.attachment.delete({ where: { id: attachment.id } });

  res.status(204).send();
});

/** Link assinado de qualquer anexo da calibracao, respeitando o escopo do cliente. */
export const getCalibrationAttachmentUrl = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CALIBRATION"]);
  const isClientUser = req.user?.role === "CLIENT";
  const calibration = await prisma.calibration.findFirst({
    where: {
      id: req.params.id,
      deletedAt: null,
      ...clientScopeFilter(req),
      ...(isClientUser ? { visibleToClient: true, status: "ISSUED" as const } : {}),
    },
    select: { id: true },
  });
  if (!calibration) throw new NotFoundError("Certificado de calibracao");

  const attachment = await prisma.attachment.findFirst({
    where: { id: req.params.attachmentId, entityType: "CALIBRATION", entityId: calibration.id },
  });
  if (!attachment) throw new NotFoundError("Anexo");

  const url = await getStorageProvider().getSignedDownloadUrl(attachment.fileKey, attachment.fileName);
  res.json({ url });
});

export const getCalibrationPdfUrl = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CALIBRATION"]);
  const isClientUser = req.user?.role === "CLIENT";
  const calibration = await prisma.calibration.findFirst({
    where: {
      id: req.params.id,
      deletedAt: null,
      ...clientScopeFilter(req),
      ...(isClientUser ? { visibleToClient: true, status: "ISSUED" as const } : {}),
    },
    include: { pdfAttachment: true },
  });
  if (!calibration || !calibration.pdfAttachment) throw new NotFoundError("Arquivo PDF");

  const url = await getStorageProvider().getSignedDownloadUrl(
    calibration.pdfAttachment.fileKey,
    calibration.pdfAttachment.fileName,
  );

  res.json({ url });
});
