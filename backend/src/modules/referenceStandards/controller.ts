import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { writeAuditLog } from "../../utils/audit";
import { getStorageProvider } from "../../lib/storage";
import { deriveDueStatus } from "../../utils/status";

/** Padrao de referencia e' equipamento proprio da OptiProcess (nao tem clientId) - so a
 * equipe interna (STAFF_ROLES, ja garantido pela rota) acessa este modulo. */

type CertificadoResumo = { calibrationDate: Date; validUntil: Date } | null;

/** "Certificado" nunca e' um booleano gravado: sempre calculado a partir do certificado
 * mais recente, senao renovar/vencer um certificado nao refletiria na tela sem reeditar
 * o padrao a mao. */
function deriveCertificationStatus(latest: CertificadoResumo) {
  if (!latest) return "NO_CERTIFICATE" as const;
  return deriveDueStatus(latest.validUntil);
}

async function attachPhotoUrl<T extends { photoKey: string | null; photoFileName: string | null }>(
  items: T[],
): Promise<(T & { photoUrl: string | null })[]> {
  const storage = getStorageProvider();
  return Promise.all(
    items.map(async (i) => ({
      ...i,
      photoUrl: i.photoKey ? await storage.getSignedDownloadUrl(i.photoKey, i.photoFileName ?? "foto", 3600) : null,
    })),
  );
}

function withDerivedStatus<T extends { certificates: CertificadoResumo[] }>(item: T) {
  const [latest] = [...item.certificates].sort(
    (a, b) => (b?.validUntil.getTime() ?? 0) - (a?.validUntil.getTime() ?? 0),
  );
  return { ...item, certificationStatus: deriveCertificationStatus(latest ?? null) };
}

export const listReferenceStandards = asyncHandler(async (req: Request, res: Response) => {
  const { active, search } = req.query as { active?: string; search?: string };
  const items = await prisma.referenceStandard.findMany({
    where: {
      deletedAt: null,
      ...(active !== undefined ? { active: active === "true" } : {}),
      ...(search
        ? {
            OR: [
              { description: { contains: search, mode: "insensitive" as const } },
              { manufacturer: { contains: search, mode: "insensitive" as const } },
              { model: { contains: search, mode: "insensitive" as const } },
              { serialNumber: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { description: "asc" },
    include: {
      certificates: { select: { calibrationDate: true, validUntil: true } },
    },
  });

  const withPhoto = await attachPhotoUrl(items.map(withDerivedStatus));
  res.json(withPhoto);
});

export const getReferenceStandard = asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.referenceStandard.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: {
      certificates: { orderBy: { validUntil: "desc" } },
    },
  });
  if (!item) throw new NotFoundError("Padrao de referencia");
  const [withPhoto] = await attachPhotoUrl([withDerivedStatus(item)]);
  res.json(withPhoto);
});

const referenceStandardSchema = z.object({
  description: z.string().min(2, "Informe a descricao do padrao."),
  type: z.string().nullish(),
  manufacturer: z.string().nullish(),
  model: z.string().nullish(),
  serialNumber: z.string().nullish(),
  measurementRange: z.string().nullish(),
  resolution: z.string().nullish(),
  unit: z.string().nullish(),
  active: z.boolean().optional(),
});

export const createReferenceStandard = asyncHandler(async (req: Request, res: Response) => {
  const data = referenceStandardSchema.parse(req.body);
  const item = await prisma.referenceStandard.create({
    data: { ...data, createdById: req.user?.sub },
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "CREATE",
    entityType: "ReferenceStandard",
    entityId: item.id,
    description: `Padrao de referencia ${item.description} cadastrado`,
  });

  res.status(201).json(item);
});

export const updateReferenceStandard = asyncHandler(async (req: Request, res: Response) => {
  const data = referenceStandardSchema.partial().parse(req.body);
  const existing = await prisma.referenceStandard.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Padrao de referencia");

  const item = await prisma.referenceStandard.update({ where: { id: existing.id }, data });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "ReferenceStandard",
    entityId: item.id,
    description: `Padrao de referencia ${item.description} atualizado`,
  });

  res.json(item);
});

export const deleteReferenceStandard = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.referenceStandard.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Padrao de referencia");

  // Exclusao logica: calibracoes que ja usaram este padrao mantem o snapshot proprio
  // (CalibrationStandard) intacto, so perdem o link de volta para o catalogo.
  await prisma.referenceStandard.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "DELETE",
    entityType: "ReferenceStandard",
    entityId: existing.id,
    description: `Padrao de referencia ${existing.description} removido`,
  });

  res.status(204).send();
});

export const uploadReferenceStandardPhoto = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.referenceStandard.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Padrao de referencia");

  const file = req.file;
  if (!file) throw new ValidationError("Selecione uma imagem.");
  if (!file.mimetype.startsWith("image/")) throw new ValidationError("A foto do padrao precisa ser uma imagem.");

  const storage = getStorageProvider();
  const key = `reference-standards/${existing.id}/foto-${Date.now()}-${file.originalname}`;
  await storage.upload(key, file.buffer, file.mimetype);

  const anterior = existing.photoKey;
  const item = await prisma.referenceStandard.update({
    where: { id: existing.id },
    data: { photoKey: key, photoFileName: file.originalname },
  });
  if (anterior) await storage.delete(anterior).catch(() => undefined);

  const [comFoto] = await attachPhotoUrl([item]);
  res.status(201).json(comFoto);
});

export const deleteReferenceStandardPhoto = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.referenceStandard.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Padrao de referencia");

  if (existing.photoKey) await getStorageProvider().delete(existing.photoKey).catch(() => undefined);
  await prisma.referenceStandard.update({ where: { id: existing.id }, data: { photoKey: null, photoFileName: null } });
  res.status(204).send();
});

// ---------------------------------------------------------------------------
// Certificados do padrao (historico) - cada calibracao do padrao gera um novo
// registro, o mais recente (por validade) e' o que conta para o status.
// ---------------------------------------------------------------------------

const certificateSchema = z.object({
  certificateNumber: z.string().nullish(),
  laboratory: z.string().nullish(),
  calibrationDate: z.coerce.date(),
  validUntil: z.coerce.date(),
  notes: z.string().nullish(),
});

export const listReferenceStandardCertificates = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.referenceStandard.findFirst({
    where: { id: req.params.id, deletedAt: null },
    select: { id: true },
  });
  if (!existing) throw new NotFoundError("Padrao de referencia");

  const certificates = await prisma.referenceStandardCertificate.findMany({
    where: { referenceStandardId: existing.id },
    orderBy: { validUntil: "desc" },
  });
  res.json(certificates);
});

export const createReferenceStandardCertificate = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.referenceStandard.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Padrao de referencia");

  const data = certificateSchema.parse(req.body);
  if (data.validUntil < data.calibrationDate) {
    throw new ValidationError("A validade nao pode ser anterior a data da calibracao.");
  }

  let fileKey: string | null = null;
  let fileFileName: string | null = null;
  const file = req.file;
  if (file) {
    fileKey = `reference-standards/${existing.id}/certificados/${Date.now()}-${file.originalname}`;
    await getStorageProvider().upload(fileKey, file.buffer, file.mimetype);
    fileFileName = file.originalname;
  }

  const certificate = await prisma.referenceStandardCertificate.create({
    data: {
      ...data,
      referenceStandardId: existing.id,
      fileKey,
      fileFileName,
      createdById: req.user?.sub,
    },
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "CREATE",
    entityType: "ReferenceStandardCertificate",
    entityId: certificate.id,
    description: `Certificado cadastrado para o padrao ${existing.description}`,
  });

  res.status(201).json(certificate);
});

export const deleteReferenceStandardCertificate = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.referenceStandard.findFirst({
    where: { id: req.params.id, deletedAt: null },
    select: { id: true, description: true },
  });
  if (!existing) throw new NotFoundError("Padrao de referencia");

  const certificate = await prisma.referenceStandardCertificate.findFirst({
    where: { id: req.params.certificateId, referenceStandardId: existing.id },
  });
  if (!certificate) throw new NotFoundError("Certificado");

  if (certificate.fileKey) await getStorageProvider().delete(certificate.fileKey).catch(() => undefined);
  await prisma.referenceStandardCertificate.delete({ where: { id: certificate.id } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "DELETE",
    entityType: "ReferenceStandardCertificate",
    entityId: certificate.id,
    description: `Certificado removido do padrao ${existing.description}`,
  });

  res.status(204).send();
});

export const getReferenceStandardCertificateUrl = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.referenceStandard.findFirst({
    where: { id: req.params.id, deletedAt: null },
    select: { id: true },
  });
  if (!existing) throw new NotFoundError("Padrao de referencia");

  const certificate = await prisma.referenceStandardCertificate.findFirst({
    where: { id: req.params.certificateId, referenceStandardId: existing.id },
  });
  if (!certificate?.fileKey) throw new NotFoundError("Arquivo do certificado");

  const url = await getStorageProvider().getSignedDownloadUrl(certificate.fileKey, certificate.fileFileName ?? "certificado");
  res.json({ url });
});
