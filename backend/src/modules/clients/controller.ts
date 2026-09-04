import type { Request, Response } from "express";
import { z } from "zod";
import { ClientStatus, ServiceCategory } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parsePageParams, toSkipTake, buildPagedResult } from "../../utils/pagination";
import { ForbiddenError, NotFoundError } from "../../utils/errors";
import { writeAuditLog } from "../../utils/audit";
import { getClientPlanUsage } from "../../lib/planLimits";

export const listClients = asyncHandler(async (req: Request, res: Response) => {
  const pageParams = parsePageParams(req.query as Record<string, unknown>);
  const { status, search, service } = req.query as {
    status?: ClientStatus;
    search?: string;
    service?: ServiceCategory;
  };

  const where = {
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(service ? { contractedServices: { has: service } } : {}),
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
      include: { _count: { select: { instruments: true, serviceOrders: true, contracts: true } }, plan: { select: { id: true, name: true } } },
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
    include: {
      contacts: true,
      // O cliente precisa enxergar o proprio contrato: qual plano, quantos acessos e
      // ativos ele tem direito, quem ja esta usando e quanto ainda cabe. Sem isso ele so
      // descobre o limite quando o cadastro e' recusado.
      plan: true,
      users: {
        where: { deletedAt: null },
        select: { id: true, name: true, email: true, active: true, lastLoginAt: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!client) throw new NotFoundError("Cliente");

  const usage = await getClientPlanUsage(client.id);
  res.json({ ...client, planUsage: { users: usage.users, instruments: usage.instruments } });
});

export const getClient = asyncHandler(async (req: Request, res: Response) => {
  const client = await prisma.client.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: {
      contacts: true,
      plan: true,
      // Usuarios de portal (role CLIENT) vinculados a esta empresa - a ficha usa isto
      // para mostrar se o acesso ja foi liberado e para quem.
      users: {
        where: { deletedAt: null },
        select: { id: true, name: true, email: true, active: true, lastLoginAt: true },
        orderBy: { createdAt: "asc" },
      },
      _count: {
        select: { instruments: true, serviceOrders: true, contracts: true, calibrations: true, orders: true },
      },
    },
  });
  if (!client) throw new NotFoundError("Cliente");
  const usage = await getClientPlanUsage(client.id);
  res.json({ ...client, planUsage: { users: usage.users, instruments: usage.instruments } });
});

const clientSchema = z.object({
  companyName: z.string().min(2, "Informe a razao social."),
  tradeName: z.string().nullish(),
  // CNPJ e' unico no banco - "" nao pode virar o valor gravado, senao o segundo cliente sem
  // CNPJ preenchido colide com o primeiro (foi o que aconteceu com "Vitopel do Brasil").
  // Normaliza para null, que o Postgres trata como "sem valor" e nao conflita.
  cnpj: z.string().nullish().transform((v) => (v && v.trim() ? v.trim() : null)),
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
  contractedServices: z.array(z.nativeEnum(ServiceCategory)).optional(),
  planId: z.string().uuid().nullish(),
  notes: z.string().nullish(),
});

export const createClient = asyncHandler(async (req: Request, res: Response) => {
  const data = clientSchema.parse(req.body);
  const client = await prisma.client.create({
    data: { ...data, planStartedAt: data.planId ? new Date() : null, createdById: req.user?.sub },
  });

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

  // Troca de plano (inclusive para nenhum) marca a data de inicio da assinatura atual -
  // atribuir o mesmo plano de novo (ou nao mexer no campo) nao reseta a data.
  const planChanged = "planId" in data && data.planId !== existing.planId;

  const client = await prisma.client.update({
    where: { id: req.params.id },
    data: { ...data, ...(planChanged ? { planStartedAt: data.planId ? new Date() : null } : {}) },
  });

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
