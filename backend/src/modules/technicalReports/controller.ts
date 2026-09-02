import type { Request, Response } from "express";
import { z } from "zod";
import { TechnicalReportCategory } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parsePageParams, toSkipTake, buildPagedResult } from "../../utils/pagination";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { writeAuditLog } from "../../utils/audit";
import { clientScopeFilter, assertServiceAccess } from "../../middleware/rbac";
import { nextDocumentNumber } from "../../utils/sequence";
import { getStorageProvider } from "../../lib/storage";

const detailInclude = {
  client: { select: { id: true, companyName: true, tradeName: true } },
  responsible: { select: { id: true, name: true } },
  pdfAttachment: { select: { id: true, fileName: true, mimeType: true, sizeBytes: true } },
};

export const listTechnicalReports = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["TECHNICAL_REPORT"]);
  const pageParams = parsePageParams(req.query as Record<string, unknown>);
  const { clientId, category, search } = req.query as {
    clientId?: string;
    category?: TechnicalReportCategory;
    search?: string;
  };
  const isClientUser = req.user?.role === "CLIENT";

  const where = {
    deletedAt: null,
    ...clientScopeFilter(req),
    ...(clientId ? { clientId } : {}),
    ...(category ? { category } : {}),
    ...(isClientUser ? { visibleToClient: true, status: "ISSUED" as const } : {}),
    ...(search ? { number: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.technicalReport.findMany({
      where,
      orderBy: { reportDate: "desc" },
      ...toSkipTake(pageParams),
      include: { client: { select: { id: true, companyName: true, tradeName: true } } },
    }),
    prisma.technicalReport.count({ where }),
  ]);

  res.json(buildPagedResult(items, total, pageParams));
});

export const getTechnicalReport = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["TECHNICAL_REPORT"]);
  const isClientUser = req.user?.role === "CLIENT";
  const report = await prisma.technicalReport.findFirst({
    where: {
      id: req.params.id,
      deletedAt: null,
      ...clientScopeFilter(req),
      ...(isClientUser ? { visibleToClient: true, status: "ISSUED" as const } : {}),
    },
    include: detailInclude,
  });
  if (!report) throw new NotFoundError("Laudo tecnico");
  res.json(report);
});

const reportSchema = z.object({
  category: z.nativeEnum(TechnicalReportCategory),
  clientId: z.string().uuid(),
  location: z.string().min(1),
  responsibleId: z.string().uuid(),
  reportDate: z.coerce.date(),
  validUntil: z.coerce.date().nullish(),
  observations: z.string().nullish(),
});

export const createTechnicalReport = asyncHandler(async (req: Request, res: Response) => {
  const data = reportSchema.parse(req.body);
  const number = await nextDocumentNumber("technicalReport", data.reportDate);

  const report = await prisma.technicalReport.create({
    data: { ...data, number, createdById: req.user?.sub },
    include: detailInclude,
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "CREATE",
    entityType: "TechnicalReport",
    entityId: report.id,
    description: `Laudo ${report.number} criado`,
  });

  res.status(201).json(report);
});

export const updateTechnicalReport = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.technicalReport.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Laudo tecnico");
  if (existing.status === "ISSUED") {
    throw new ValidationError("Laudo ja emitido nao pode ser editado.");
  }

  const data = reportSchema.partial().parse(req.body);
  const report = await prisma.technicalReport.update({ where: { id: existing.id }, data, include: detailInclude });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "TechnicalReport",
    entityId: report.id,
    description: `Laudo ${report.number} atualizado`,
  });

  res.json(report);
});

export const deleteTechnicalReport = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.technicalReport.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Laudo tecnico");

  await prisma.technicalReport.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "DELETE",
    entityType: "TechnicalReport",
    entityId: existing.id,
    description: `Laudo ${existing.number} removido`,
  });

  res.status(204).send();
});

export const issueTechnicalReport = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.technicalReport.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Laudo tecnico");
  if (!existing.pdfAttachmentId) throw new ValidationError("Anexe o PDF final antes de emitir o laudo.");

  const report = await prisma.technicalReport.update({
    where: { id: existing.id },
    data: { status: "ISSUED" },
    include: detailInclude,
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "PUBLISH",
    entityType: "TechnicalReport",
    entityId: report.id,
    description: `Laudo ${report.number} emitido`,
  });

  res.json(report);
});

export const setTechnicalReportVisibility = asyncHandler(async (req: Request, res: Response) => {
  const visible = Boolean((req.body as { visibleToClient?: boolean }).visibleToClient);
  const existing = await prisma.technicalReport.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Laudo tecnico");

  const report = await prisma.technicalReport.update({
    where: { id: existing.id },
    data: { visibleToClient: visible },
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: visible ? "PUBLISH" : "HIDE",
    entityType: "TechnicalReport",
    entityId: report.id,
    description: visible ? "Liberado para o portal do cliente" : "Ocultado do portal do cliente",
  });

  res.json(report);
});

export const uploadTechnicalReportPdf = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.technicalReport.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Laudo tecnico");

  const file = req.file;
  if (!file) throw new ValidationError("Envie o arquivo PDF do laudo.");

  const key = `technical-reports/${existing.id}/${Date.now()}-${file.originalname}`;
  await getStorageProvider().upload(key, file.buffer, file.mimetype);

  const attachment = await prisma.attachment.create({
    data: {
      entityType: "TECHNICAL_REPORT",
      entityId: existing.id,
      fileKey: key,
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      uploadedById: req.user?.sub,
    },
  });

  const report = await prisma.technicalReport.update({
    where: { id: existing.id },
    data: { pdfAttachmentId: attachment.id },
    include: detailInclude,
  });

  res.json(report);
});

export const getTechnicalReportPdfUrl = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["TECHNICAL_REPORT"]);
  const isClientUser = req.user?.role === "CLIENT";
  const report = await prisma.technicalReport.findFirst({
    where: {
      id: req.params.id,
      deletedAt: null,
      ...clientScopeFilter(req),
      ...(isClientUser ? { visibleToClient: true, status: "ISSUED" as const } : {}),
    },
    include: { pdfAttachment: true },
  });
  if (!report || !report.pdfAttachment) throw new NotFoundError("Arquivo PDF");

  const url = await getStorageProvider().getSignedDownloadUrl(report.pdfAttachment.fileKey, report.pdfAttachment.fileName);
  res.json({ url });
});
