import type { Request, Response } from "express";
import { z } from "zod";
import { ContractPeriodicity, ContractStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parsePageParams, toSkipTake, buildPagedResult } from "../../utils/pagination";
import { ForbiddenError, NotFoundError } from "../../utils/errors";
import { writeAuditLog } from "../../utils/audit";
import { clientScopeFilter, contractedServicesFilter } from "../../middleware/rbac";
import { deriveDueStatus } from "../../utils/status";

/** Contratos nao tem uma categoria propria: liberado no portal para quem contratou
 * qualquer servico (ficha de cliente sem nenhum servico marcado nao ve esta area). */
async function assertHasAnyContractedService(req: import("express").Request): Promise<void> {
  const services = await contractedServicesFilter(req);
  if (services !== null && services.length === 0) {
    throw new ForbiddenError("Nenhum servico liberado para o seu acesso no portal.");
  }
}

function withDerivedStatus<T extends { status: ContractStatus; endDate: Date | null }>(contract: T) {
  if (contract.status === "CANCELED") return { ...contract, derivedStatus: "CANCELED" as const };
  return { ...contract, derivedStatus: deriveDueStatus(contract.endDate) };
}

export const listContracts = asyncHandler(async (req: Request, res: Response) => {
  await assertHasAnyContractedService(req);
  const pageParams = parsePageParams(req.query as Record<string, unknown>);
  const { clientId, status } = req.query as { clientId?: string; status?: ContractStatus };

  const where = {
    deletedAt: null,
    ...clientScopeFilter(req),
    ...(clientId ? { clientId } : {}),
    ...(status ? { status } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.serviceContract.findMany({
      where,
      orderBy: { endDate: "asc" },
      ...toSkipTake(pageParams),
      include: {
        client: { select: { id: true, companyName: true, tradeName: true } },
        responsible: { select: { id: true, name: true } },
      },
    }),
    prisma.serviceContract.count({ where }),
  ]);

  res.json(buildPagedResult(items.map(withDerivedStatus), total, pageParams));
});

export const getContract = asyncHandler(async (req: Request, res: Response) => {
  await assertHasAnyContractedService(req);
  const contract = await prisma.serviceContract.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    include: {
      client: { select: { id: true, companyName: true, tradeName: true } },
      responsible: { select: { id: true, name: true } },
    },
  });
  if (!contract) throw new NotFoundError("Contrato");
  res.json(withDerivedStatus(contract));
});

const contractSchema = z.object({
  clientId: z.string().uuid(),
  serviceName: z.string().min(2),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullish(),
  value: z.coerce.number().nullish(),
  periodicity: z.nativeEnum(ContractPeriodicity),
  responsibleId: z.string().uuid().nullish(),
  status: z.nativeEnum(ContractStatus).optional(),
  notes: z.string().nullish(),
});

export const createContract = asyncHandler(async (req: Request, res: Response) => {
  const data = contractSchema.parse(req.body);
  const contract = await prisma.serviceContract.create({ data: { ...data, createdById: req.user?.sub } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "CREATE",
    entityType: "ServiceContract",
    entityId: contract.id,
    description: `Contrato "${contract.serviceName}" criado`,
  });

  res.status(201).json(contract);
});

export const updateContract = asyncHandler(async (req: Request, res: Response) => {
  const data = contractSchema.partial().parse(req.body);
  const existing = await prisma.serviceContract.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Contrato");

  const contract = await prisma.serviceContract.update({ where: { id: existing.id }, data });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "ServiceContract",
    entityId: contract.id,
    description: `Contrato "${contract.serviceName}" atualizado`,
  });

  res.json(contract);
});

export const deleteContract = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.serviceContract.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Contrato");

  await prisma.serviceContract.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "DELETE",
    entityType: "ServiceContract",
    entityId: existing.id,
    description: `Contrato "${existing.serviceName}" removido`,
  });

  res.status(204).send();
});
