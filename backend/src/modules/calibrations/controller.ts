import type { Request, Response } from "express";
import { z } from "zod";
import { CalibrationResult, PointResult, DocumentStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parsePageParams, toSkipTake, buildPagedResult } from "../../utils/pagination";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { writeAuditLog } from "../../utils/audit";
import { clientScopeFilter } from "../../middleware/rbac";
import { nextDocumentNumber } from "../../utils/sequence";
import { computeNextDueDate } from "../../utils/status";
import { generateCertificateQrCode } from "../../lib/qrcode";
import { getStorageProvider } from "../../lib/storage";

const detailInclude = {
  client: { select: { id: true, companyName: true, tradeName: true } },
  instrument: true,
  technician: { select: { id: true, name: true } },
  points: { orderBy: { sortOrder: "asc" as const } },
  pdfAttachment: { select: { id: true, fileName: true, mimeType: true, sizeBytes: true } },
  serviceOrder: { select: { id: true, number: true } },
};

export const listCalibrations = asyncHandler(async (req: Request, res: Response) => {
  const pageParams = parsePageParams(req.query as Record<string, unknown>);
  const { clientId, instrumentId, search, includeSuperseded } = req.query as {
    clientId?: string;
    instrumentId?: string;
    search?: string;
    includeSuperseded?: string;
  };

  const isClientUser = req.user?.role === "CLIENT";

  const where = {
    deletedAt: null,
    ...clientScopeFilter(req),
    ...(clientId ? { clientId } : {}),
    ...(instrumentId ? { instrumentId } : {}),
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

const calibrationSchema = z.object({
  clientId: z.string().uuid(),
  instrumentId: z.string().uuid(),
  serviceOrderId: z.string().uuid().nullish(),
  calibrationDate: z.coerce.date(),
  location: z.string().min(1),
  technicianId: z.string().uuid(),
  standardUsed: z.string().min(1),
  traceability: z.string().min(1),
  ambientTemperature: z.coerce.number().nullish(),
  ambientHumidity: z.coerce.number().nullish(),
  environmentalNotes: z.string().nullish(),
  result: z.nativeEnum(CalibrationResult),
  technicalConclusion: z.string().min(1),
  validUntil: z.coerce.date(),
  points: z.array(pointSchema).min(1, "Inclua ao menos um ponto calibrado."),
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
      ambientTemperature: data.ambientTemperature ?? null,
      ambientHumidity: data.ambientHumidity ?? null,
      environmentalNotes: data.environmentalNotes,
      result: data.result,
      technicalConclusion: data.technicalConclusion,
      validUntil: data.validUntil,
      createdById: req.user?.sub,
      points: { create: data.points.map((p, index) => ({ ...p, sortOrder: index })) },
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
  const { points, ...rest } = data;

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

export const issueCalibration = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.calibration.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Certificado de calibracao");
  if (existing.status === "ISSUED") throw new ValidationError("Certificado ja esta emitido.");
  if (!existing.pdfAttachmentId) throw new ValidationError("Anexe o PDF final antes de emitir o certificado.");

  const instrument = await prisma.instrument.findUniqueOrThrow({ where: { id: existing.instrumentId } });
  const nextDueDate = computeNextDueDate(existing.calibrationDate, instrument.calibrationFrequencyMonths);

  const [calibration] = await prisma.$transaction([
    prisma.calibration.update({ where: { id: existing.id }, data: { status: "ISSUED" } }),
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
    description: `Certificado ${calibration.certificateNumber} emitido`,
  });

  res.json(calibration);
});

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

export const uploadCalibrationPdf = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.calibration.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Certificado de calibracao");

  const file = req.file;
  if (!file) throw new ValidationError("Envie o arquivo PDF do certificado.");

  const key = `calibrations/${existing.id}/${Date.now()}-${file.originalname}`;
  await getStorageProvider().upload(key, file.buffer, file.mimetype);

  const attachment = await prisma.attachment.create({
    data: {
      entityType: "CALIBRATION",
      entityId: existing.id,
      fileKey: key,
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      uploadedById: req.user?.sub,
    },
  });

  const calibration = await prisma.calibration.update({
    where: { id: existing.id },
    data: { pdfAttachmentId: attachment.id },
    include: detailInclude,
  });

  res.json(calibration);
});

export const getCalibrationPdfUrl = asyncHandler(async (req: Request, res: Response) => {
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
