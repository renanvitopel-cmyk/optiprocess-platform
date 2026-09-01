import type { Request, Response } from "express";
import { AttachmentEntityType } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { getStorageProvider } from "../../lib/storage";

export const listAttachments = asyncHandler(async (req: Request, res: Response) => {
  const { entityType, entityId } = req.query as { entityType?: AttachmentEntityType; entityId?: string };
  if (!entityType || !entityId) throw new ValidationError("Informe entityType e entityId.");

  const items = await prisma.attachment.findMany({
    where: { entityType, entityId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  res.json(items);
});

export const uploadAttachment = asyncHandler(async (req: Request, res: Response) => {
  const { entityType, entityId } = req.body as { entityType?: AttachmentEntityType; entityId?: string };
  if (!entityType || !entityId) throw new ValidationError("Informe entityType e entityId.");
  const file = req.file;
  if (!file) throw new ValidationError("Envie um arquivo.");

  const key = `${entityType.toLowerCase()}/${entityId}/${Date.now()}-${file.originalname}`;
  await getStorageProvider().upload(key, file.buffer, file.mimetype);

  const attachment = await prisma.attachment.create({
    data: {
      entityType,
      entityId,
      fileKey: key,
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      uploadedById: req.user?.sub,
    },
  });

  res.status(201).json(attachment);
});

export const getAttachmentUrl = asyncHandler(async (req: Request, res: Response) => {
  const attachment = await prisma.attachment.findUnique({ where: { id: req.params.id } });
  if (!attachment) throw new NotFoundError("Anexo");

  const url = await getStorageProvider().getSignedDownloadUrl(attachment.fileKey, attachment.fileName);
  res.json({ url });
});

export const deleteAttachment = asyncHandler(async (req: Request, res: Response) => {
  const attachment = await prisma.attachment.findUnique({ where: { id: req.params.id } });
  if (!attachment) throw new NotFoundError("Anexo");

  await getStorageProvider().delete(attachment.fileKey);
  await prisma.attachment.delete({ where: { id: attachment.id } });

  res.status(204).send();
});
