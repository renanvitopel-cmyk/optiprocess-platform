import type { Request, Response } from "express";
import { z } from "zod";
import { MaintenanceTriggerType } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parsePageParams, toSkipTake, buildPagedResult } from "../../utils/pagination";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { writeAuditLog } from "../../utils/audit";
import { clientScopeFilter, assertServiceAccess, assertOwnClient, resolveClientId } from "../../middleware/rbac";
import { deriveDueStatus, computeNextDueDateFromDays } from "../../utils/status";
import { nextClientMaintenanceOrderNumber } from "../../utils/sequence";

const detailInclude = {
  client: { select: { id: true, companyName: true, tradeName: true } },
  instrument: { select: { id: true, type: true, model: true, serialNumber: true, tag: true } },
  meter: { select: { id: true, name: true, unit: true, currentValue: true } },
  responsible: { select: { id: true, name: true } },
  checklistTemplate: { orderBy: { sortOrder: "asc" as const } },
};

/** Status derivado do plano: TIME usa a mesma janela de vencimento de calibracao/contrato;
 * METER compara a leitura atual do medidor com a leitura na ultima geracao + intervalo. */
function withDerivedStatus<
  T extends {
    triggerType: MaintenanceTriggerType;
    nextDueDate: Date | null;
    meterInterval: number | null;
    lastMeterAtGeneration: number | null;
    meter: { currentValue: number } | null;
  },
>(plan: T) {
  if (plan.triggerType === "TIME") {
    return { ...plan, derivedStatus: deriveDueStatus(plan.nextDueDate) };
  }
  if (plan.meter && plan.meterInterval != null) {
    const used = plan.meter.currentValue - (plan.lastMeterAtGeneration ?? 0);
    const remaining = plan.meterInterval - used;
    const derivedStatus = remaining < 0 ? "EXPIRED" : remaining <= plan.meterInterval * 0.1 ? "DUE_SOON" : "VALID";
    return { ...plan, derivedStatus };
  }
  return { ...plan, derivedStatus: "VALID" as const };
}

export const listMaintenancePlans = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const pageParams = parsePageParams(req.query as Record<string, unknown>);
  const { clientId, instrumentId, active } = req.query as { clientId?: string; instrumentId?: string; active?: string };

  const where = {
    deletedAt: null,
    ...clientScopeFilter(req),
    ...(clientId ? { clientId } : {}),
    ...(instrumentId ? { instrumentId } : {}),
    ...(active !== undefined ? { active: active === "true" } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.maintenancePlan.findMany({
      where,
      orderBy: { nextDueDate: "asc" },
      ...toSkipTake(pageParams),
      include: {
        client: { select: { id: true, companyName: true, tradeName: true } },
        instrument: { select: { id: true, type: true, model: true, serialNumber: true, tag: true } },
        meter: { select: { id: true, name: true, unit: true, currentValue: true } },
      },
    }),
    prisma.maintenancePlan.count({ where }),
  ]);

  res.json(buildPagedResult(items.map(withDerivedStatus), total, pageParams));
});

export const getMaintenancePlan = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const plan = await prisma.maintenancePlan.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    include: {
      ...detailInclude,
      workOrders: { orderBy: { createdAt: "desc" }, take: 10, select: { id: true, number: true, status: true, completedAt: true } },
    },
  });
  if (!plan) throw new NotFoundError("Plano de manutencao");
  res.json(withDerivedStatus(plan));
});

const checklistItemSchema = z.object({ description: z.string().min(1) });

const planSchema = z.object({
  clientId: z.string().uuid().optional(),
  instrumentId: z.string().uuid(),
  name: z.string().min(2, "Informe o nome do plano."),
  description: z.string().nullish(),
  triggerType: z.nativeEnum(MaintenanceTriggerType),
  frequencyDays: z.coerce.number().int().positive().nullish(),
  meterId: z.string().uuid().nullish(),
  meterInterval: z.coerce.number().positive().nullish(),
  active: z.boolean().optional(),
  responsibleId: z.string().uuid().nullish(),
  checklistTemplate: z.array(checklistItemSchema).optional(),
});

export const createMaintenancePlan = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = planSchema.parse(req.body);
  const clientId = resolveClientId(req, data.clientId);
  if (data.triggerType === "TIME" && !data.frequencyDays) {
    throw new ValidationError("Informe a periodicidade em dias para um plano por tempo.");
  }
  if (data.triggerType === "METER" && (!data.meterId || !data.meterInterval)) {
    throw new ValidationError("Informe o medidor e o intervalo para um plano por medidor.");
  }

  const instrument = await prisma.instrument.findFirst({ where: { id: data.instrumentId, deletedAt: null }, select: { clientId: true } });
  if (!instrument) throw new NotFoundError("Ativo");
  if (instrument.clientId !== clientId) throw new ValidationError("Esse ativo pertence a outra empresa.");

  const { checklistTemplate, ...planData } = data;
  const nextDueDate = data.triggerType === "TIME" ? computeNextDueDateFromDays(new Date(), data.frequencyDays!) : null;

  const plan = await prisma.maintenancePlan.create({
    data: {
      ...planData,
      clientId,
      nextDueDate,
      createdById: req.user?.sub,
      checklistTemplate: { create: (checklistTemplate ?? []).map((c, i) => ({ description: c.description, sortOrder: i })) },
    },
    include: detailInclude,
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "CREATE",
    entityType: "MaintenancePlan",
    entityId: plan.id,
    description: `Plano de manutencao "${plan.name}" criado`,
  });

  res.status(201).json(withDerivedStatus(plan));
});

export const updateMaintenancePlan = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = planSchema.partial().parse(req.body);
  const existing = await prisma.maintenancePlan.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Plano de manutencao");
  assertOwnClient(req, existing.clientId);

  const { checklistTemplate, ...planData } = data;
  if (req.user?.role === "CLIENT") delete planData.clientId;
  const frequencyDays = data.frequencyDays ?? existing.frequencyDays;
  const triggerType = data.triggerType ?? existing.triggerType;
  const nextDueDate =
    triggerType === "TIME" && frequencyDays ? computeNextDueDateFromDays(new Date(), frequencyDays) : existing.nextDueDate;

  const plan = await prisma.maintenancePlan.update({
    where: { id: existing.id },
    data: {
      ...planData,
      nextDueDate,
      ...(checklistTemplate
        ? {
            checklistTemplate: {
              deleteMany: {},
              create: checklistTemplate.map((c, i) => ({ description: c.description, sortOrder: i })),
            },
          }
        : {}),
    },
    include: detailInclude,
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "MaintenancePlan",
    entityId: plan.id,
    description: `Plano de manutencao "${plan.name}" atualizado`,
  });

  res.json(withDerivedStatus(plan));
});

export const deleteMaintenancePlan = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const existing = await prisma.maintenancePlan.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Plano de manutencao");
  assertOwnClient(req, existing.clientId);

  await prisma.maintenancePlan.update({ where: { id: existing.id }, data: { deletedAt: new Date(), active: false } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "DELETE",
    entityType: "MaintenancePlan",
    entityId: existing.id,
    description: `Plano de manutencao "${existing.name}" removido`,
  });

  res.status(204).send();
});

/** Gera uma Ordem de Manutencao preventiva a partir do plano, copiando o checklist e
 * avancando a proxima data/leitura de referencia - mesma logica de "Nova calibracao"
 * a partir do Ativo, so que sem worker/cron (nao ha infraestrutura para isso aqui). */
export const generateWorkOrderFromPlan = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const plan = await prisma.maintenancePlan.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: { checklistTemplate: { orderBy: { sortOrder: "asc" } }, meter: true },
  });
  if (!plan) throw new NotFoundError("Plano de manutencao");
  assertOwnClient(req, plan.clientId);
  if (!plan.active) throw new ValidationError("Plano inativo nao pode gerar ordem de manutencao.");

  const number = await nextClientMaintenanceOrderNumber(plan.clientId);

  const workOrder = await prisma.maintenanceWorkOrder.create({
    data: {
      number,
      clientId: plan.clientId,
      instrumentId: plan.instrumentId,
      planId: plan.id,
      type: "PREVENTIVE",
      status: "OPEN",
      description: plan.name,
      technicianId: plan.responsibleId,
      meterReadingAtExecution: plan.meter?.currentValue,
      createdById: req.user?.sub,
      checklist: { create: plan.checklistTemplate.map((c, i) => ({ description: c.description, sortOrder: i })) },
    },
  });

  await prisma.maintenancePlan.update({
    where: { id: plan.id },
    data: {
      lastGeneratedAt: new Date(),
      lastMeterAtGeneration: plan.meter?.currentValue,
      nextDueDate: plan.triggerType === "TIME" && plan.frequencyDays ? computeNextDueDateFromDays(new Date(), plan.frequencyDays) : plan.nextDueDate,
    },
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "CREATE",
    entityType: "MaintenanceWorkOrder",
    entityId: workOrder.id,
    description: `OS ${workOrder.number} gerada a partir do plano "${plan.name}"`,
  });

  res.status(201).json(workOrder);
});
