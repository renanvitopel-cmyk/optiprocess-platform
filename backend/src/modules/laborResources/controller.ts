import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parsePageParams, toSkipTake, buildPagedResult } from "../../utils/pagination";
import { ForbiddenError, NotFoundError, ValidationError } from "../../utils/errors";
import { writeAuditLog } from "../../utils/audit";
import { clientScopeFilter, assertServiceAccess } from "../../middleware/rbac";
import { getStorageProvider } from "../../lib/storage";

/** Troca a chave de armazenamento por um link temporario que a tela consegue exibir.
 * Assinar e' local (nao vai na rede), entao da pra fazer item a item na listagem. */
async function attachLaborPhotoUrl<T extends { photoKey: string | null; photoFileName: string | null }>(
  recursos: T[],
): Promise<(T & { photoUrl: string | null })[]> {
  const storage = getStorageProvider();
  return Promise.all(
    recursos.map(async (r) => ({
      ...r,
      photoUrl: r.photoKey ? await storage.getSignedDownloadUrl(r.photoKey, r.photoFileName ?? "foto", 3600) : null,
    })),
  );
}

export const listLaborResources = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const pageParams = parsePageParams(req.query as Record<string, unknown>);
  const { clientId, search, active } = req.query as { clientId?: string; search?: string; active?: string };

  const where = {
    deletedAt: null,
    ...clientScopeFilter(req),
    ...(clientId ? { clientId } : {}),
    ...(active !== undefined ? { active: active === "true" } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { type: { contains: search, mode: "insensitive" as const } },
            { registrationNumber: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.laborResource.findMany({ where, orderBy: { name: "asc" }, ...toSkipTake(pageParams) }),
    prisma.laborResource.count({ where }),
  ]);

  res.json(buildPagedResult(await attachLaborPhotoUrl(items), total, pageParams));
});

export const getLaborResource = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const resource = await prisma.laborResource.findFirst({ where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) } });
  if (!resource) throw new NotFoundError("Recurso de mao de obra");
  const [comFoto] = await attachLaborPhotoUrl([resource]);
  res.json(comFoto);
});

const laborResourceSchema = z.object({
  clientId: z.string().uuid().optional(),
  type: z.string().min(1, "Informe o tipo de mao de obra."),
  name: z.string().min(2, "Informe o nome."),
  registrationNumber: z.string().nullish(),
  hourlyRate: z.coerce.number().nonnegative().nullish(),
});

export const createLaborResource = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = laborResourceSchema.parse(req.body);

  if (req.user?.role === "CLIENT") {
    if (!req.user.clientId) throw new ForbiddenError();
    data.clientId = req.user.clientId;
  } else if (!data.clientId) {
    throw new ValidationError("Selecione o cliente.");
  }

  const resource = await prisma.laborResource.create({ data: { ...data, clientId: data.clientId!, createdById: req.user?.sub } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "CREATE",
    entityType: "LaborResource",
    entityId: resource.id,
    description: `Mao de obra "${resource.name}" cadastrada`,
  });

  res.status(201).json(resource);
});

const updateSchema = laborResourceSchema.partial().extend({ active: z.boolean().optional() });

export const updateLaborResource = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = updateSchema.parse(req.body);
  const existing = await prisma.laborResource.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Recurso de mao de obra");

  if (req.user?.role === "CLIENT") {
    if (existing.clientId !== req.user.clientId) throw new ForbiddenError();
    delete data.clientId;
  }

  const resource = await prisma.laborResource.update({ where: { id: existing.id }, data });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "LaborResource",
    entityId: resource.id,
    description: `Mao de obra "${resource.name}" atualizada`,
  });

  const [comFoto] = await attachLaborPhotoUrl([resource]);
  res.json(comFoto);
});

export const deleteLaborResource = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.laborResource.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Recurso de mao de obra");
  if (req.user?.role === "CLIENT" && existing.clientId !== req.user.clientId) throw new ForbiddenError();

  await prisma.laborResource.update({ where: { id: existing.id }, data: { deletedAt: new Date(), active: false } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "DELETE",
    entityType: "LaborResource",
    entityId: existing.id,
    description: `Mao de obra "${existing.name}" removida`,
  });

  res.status(204).send();
});

/**
 * Foto da pessoa da equipe. Uma so por recurso: trocar apaga a anterior do armazenamento,
 * porque acumular arquivo orfao de um campo que guarda um so nao ajuda ninguem.
 */
export const uploadLaborResourcePhoto = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const existing = await prisma.laborResource.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
  });
  if (!existing) throw new NotFoundError("Mao de obra");

  const file = req.file;
  if (!file) throw new ValidationError("Selecione uma imagem.");
  if (!file.mimetype.startsWith("image/")) throw new ValidationError("A foto precisa ser uma imagem.");

  const storage = getStorageProvider();
  const key = `labor-resources/${existing.id}/foto-${Date.now()}-${file.originalname}`;
  await storage.upload(key, file.buffer, file.mimetype);

  const anterior = existing.photoKey;
  const resource = await prisma.laborResource.update({
    where: { id: existing.id },
    data: { photoKey: key, photoFileName: file.originalname },
  });
  if (anterior) await storage.delete(anterior).catch(() => undefined);

  const [comFoto] = await attachLaborPhotoUrl([resource]);
  res.status(201).json(comFoto);
});

export const deleteLaborResourcePhoto = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const existing = await prisma.laborResource.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
  });
  if (!existing) throw new NotFoundError("Mao de obra");

  if (existing.photoKey) await getStorageProvider().delete(existing.photoKey).catch(() => undefined);
  await prisma.laborResource.update({ where: { id: existing.id }, data: { photoKey: null, photoFileName: null } });
  res.status(204).send();
});
