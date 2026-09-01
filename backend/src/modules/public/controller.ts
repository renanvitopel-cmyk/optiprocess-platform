import type { Request, Response } from "express";
import { z } from "zod";
import { QuoteSource, ServiceCategory, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { deriveDueStatus } from "../../utils/status";
import { nextDocumentNumber } from "../../utils/sequence";
import { getStorageProvider } from "../../lib/storage";
import { env } from "../../config/env";

export const getPublicConfig = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ whatsappNumber: env.whatsappNumber });
});

type CertificateWithRelations = Prisma.CalibrationGetPayload<{ include: { client: true; instrument: true } }>;

async function findIssuedCertificateByCode(code: string): Promise<CertificateWithRelations | null> {
  let calibration: CertificateWithRelations | null = await prisma.calibration.findFirst({
    where: { OR: [{ certificateNumber: code }, { qrCodeToken: code }], deletedAt: null },
    include: { client: true, instrument: true },
  });
  if (!calibration) return null;

  // Segue a cadeia ate a revisao mais recente, se o codigo apontar para uma revisao antiga.
  for (let i = 0; i < 20; i++) {
    const next: CertificateWithRelations | null = await prisma.calibration.findUnique({
      where: { previousRevisionId: calibration.id },
      include: { client: true, instrument: true },
    });
    if (!next) break;
    calibration = next;
  }

  return calibration;
}

export const validateCertificate = asyncHandler(async (req: Request, res: Response) => {
  const code = (req.params.code ?? req.query.code ?? "").toString().trim();
  const calibration = code ? await findIssuedCertificateByCode(code) : null;

  if (!calibration || calibration.status !== "ISSUED") {
    res.status(404).json({ valid: false, message: "Certificado nao encontrado. Verifique o numero informado." });
    return;
  }

  res.json({
    valid: true,
    certificateNumber: calibration.certificateNumber,
    revisionNumber: calibration.revisionNumber,
    client: calibration.client.tradeName || calibration.client.companyName,
    instrument: {
      type: calibration.instrument.type,
      manufacturer: calibration.instrument.manufacturer,
      model: calibration.instrument.model,
      serialNumber: calibration.instrument.serialNumber,
      tag: calibration.instrument.tag,
    },
    calibrationDate: calibration.calibrationDate,
    validUntil: calibration.validUntil,
    result: calibration.result,
    status: deriveDueStatus(calibration.validUntil),
    pdfAvailable: calibration.visibleToClient && !!calibration.pdfAttachmentId,
  });
});

export const getPublicCertificatePdfUrl = asyncHandler(async (req: Request, res: Response) => {
  const code = (req.params.code ?? "").toString().trim();
  const calibration = code ? await findIssuedCertificateByCode(code) : null;

  if (!calibration || calibration.status !== "ISSUED" || !calibration.visibleToClient || !calibration.pdfAttachmentId) {
    res.status(404).json({ message: "PDF nao disponivel para este certificado." });
    return;
  }

  const attachment = await prisma.attachment.findUnique({ where: { id: calibration.pdfAttachmentId } });
  if (!attachment) {
    res.status(404).json({ message: "PDF nao disponivel para este certificado." });
    return;
  }

  const url = await getStorageProvider().getSignedDownloadUrl(attachment.fileKey, attachment.fileName);
  res.json({ url });
});

const publicQuoteSchema = z.object({
  source: z.nativeEnum(QuoteSource),
  contactName: z.string().min(2, "Informe seu nome."),
  contactEmail: z.string().email("Informe um e-mail valido."),
  contactPhone: z.string().nullish(),
  serviceCategory: z.nativeEnum(ServiceCategory).nullish(),
  message: z.string().nullish(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.coerce.number().int().positive(),
        unitPriceRequested: z.coerce.number().nullish(),
      }),
    )
    .optional(),
});

export const submitPublicQuote = asyncHandler(async (req: Request, res: Response) => {
  const data = publicQuoteSchema.parse(req.body);
  const number = await nextDocumentNumber("quote");
  const clientId = req.user?.role === "CLIENT" ? req.user.clientId : null;

  const quote = await prisma.quote.create({
    data: {
      number,
      clientId,
      source: data.source,
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      serviceCategory: data.serviceCategory,
      message: data.message,
      items: data.items?.length
        ? {
            create: data.items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              unitPriceRequested: i.unitPriceRequested,
            })),
          }
        : undefined,
    },
  });

  const commercialUsers = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "COMMERCIAL"] }, active: true, deletedAt: null },
    select: { id: true },
  });
  if (commercialUsers.length > 0) {
    await prisma.notification.createMany({
      data: commercialUsers.map((u) => ({
        userId: u.id,
        title: "Nova solicitacao recebida",
        message: `${data.contactName} enviou a solicitacao ${number}`,
        link: `/gestao/orcamentos/${quote.id}`,
      })),
    });
  }

  res.status(201).json({ number: quote.number });
});
