import type { Request, Response } from "express";
import { z } from "zod";
import { ClientStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parsePageParams, toSkipTake, buildPagedResult } from "../../utils/pagination";
import { ForbiddenError, NotFoundError } from "../../utils/errors";
import { writeAuditLog } from "../../utils/audit";

export const listClients = asyncHandler(async (req: Request, res: Response) => {
  const pageParams = parsePageParams(req.query as Record<string, unknown>);
  const { status, search } = req.query as { status?: ClientStatus; search?: string };

  const where = {
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { companyName: { contains: search, mode: "insensitive" as const } },
            { tradeName: { contains: search, mode: "insensitive" as const } },
            { cnpj: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { companyName: "asc" },
      ...toSkipTake(pageParams),
      include: { _count: { select: { instruments: true, serviceOrders: true, contracts: true } } },
    }),
    prisma.client.count({ where }),
  ]);

  res.json(buildPagedResult(items, total, pageParams));
});

/** Portal do cliente: ve os proprios dados de cadastro e contatos, sem acesso ao restante do modulo. */
export const getOwnClient = asyncHandler(async (req: Request, res: Response) => {
  if (req.user?.role !== "CLIENT" || !req.user.clientId) throw new ForbiddenError();

  const client = await prisma.client.findFirst({
    where: { id: req.user.clientId, deletedAt: null },
    include: { contacts: true },
  });
  if (!client) throw new NotFoundError("Cliente");
  res.json(client);
});

export const getClient = asyncHandler(async (req: Request, res: Response) => {
  const client = await prisma.client.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: {
      contacts: true,
      _count: {
        select: { instruments: true, serviceOrders: true, contracts: true, calibrations: true, orders: true },
      },
    },
  });
  if (!client) throw new NotFoundError("Cliente");
  res.json(client);
});

const clientSchema = z.object({
  companyName: z.string().min(2, "Informe a razao social."),
  tradeName: z.string().nullish(),
  cnpj: z.string().nullish(),
  stateRegistration: z.string().nullish(),
  addressStreet: z.string().nullish(),
  addressNumber: z.string().nullish(),
  addressComplement: z.string().nullish(),
  addressDistrict: z.string().nullish(),
  addressCity: z.string().nullish(),
  addressState: z.string().nullish(),
  addressZip: z.string().nullish(),
  phone: z.string().nullish(),
  whatsapp: z.string().nullish(),
  email: z.string().email().nullish().or(z.literal("")),
  technicalContactName: z.string().nullish(),
  commercialContactName: z.string().nullish(),
  status: z.nativeEnum(ClientStatus).optional(),
  notes: z.string().nullish(),
});

export const createClient = asyncHandler(async (req: Request, res: Response) => {
  const data = clientSchema.parse(req.body);
  const client = await prisma.client.create({ data: { ...data, createdById: req.user?.sub } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "CREATE",
    entityType: "Client",
    entityId: client.id,
    description: `Cliente ${client.companyName} cadastrado`,
  });

  res.status(201).json(client);
});

export const updateClient = asyncHandler(async (req: Request, res: Response) => {
  const data = clientSchema.partial().parse(req.body);
  const existing = await prisma.client.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Cliente");

  const client = await prisma.client.update({ where: { id: req.params.id }, data });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "Client",
    entityId: client.id,
    description: `Cliente ${client.companyName} atualizado`,
  });

  res.json(client);
});

export const deleteClient = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.client.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Cliente");

  await prisma.client.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "DELETE",
    entityType: "Client",
    entityId: existing.id,
    description: `Cliente ${existing.companyName} removido`,
  });

  res.status(204).send();
});

const contactSchema = z.object({
  name: z.string().min(2),
  role: z.string().nullish(),
  email: z.string().email().nullish().or(z.literal("")),
  phone: z.string().nullish(),
  whatsapp: z.string().nullish(),
  isPrimary: z.boolean().optional(),
});

export const addClientContact = asyncHandler(async (req: Request, res: Response) => {
  const data = contactSchema.parse(req.body);
  const client = await prisma.client.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!client) throw new NotFoundError("Cliente");

  const contact = await prisma.clientContact.create({ data: { ...data, clientId: client.id } });
  res.status(201).json(contact);
});

export const updateClientContact = asyncHandler(async (req: Request, res: Response) => {
  const data = contactSchema.partial().parse(req.body);
  const contact = await prisma.clientContact.findFirst({
    where: { id: req.params.contactId, clientId: req.params.id },
  });
  if (!contact) throw new NotFoundError("Contato");

  const updated = await prisma.clientContact.update({ where: { id: contact.id }, data });
  res.json(updated);
});

export const deleteClientContact = asyncHandler(async (req: Request, res: Response) => {
  const contact = await prisma.clientContact.findFirst({
    where: { id: req.params.contactId, clientId: req.params.id },
  });
  if (!contact) throw new NotFoundError("Contato");

  await prisma.clientContact.delete({ where: { id: contact.id } });
  res.status(204).send();
});
