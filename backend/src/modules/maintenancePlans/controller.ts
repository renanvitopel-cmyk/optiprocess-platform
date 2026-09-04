import type { Request, Response } from "express";
import { z } from "zod";
import { MaintenanceTriggerType, MaintenancePlanStatus, MaintenancePlanType, MaintenancePlanScope, MaintenancePriority, MaintenanceFrequencyUnit, OperationalCalendar, MeterResetRule, MaintenanceTriggerMode } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parsePageParams, toSkipTake, buildPagedResult } from "../../utils/pagination";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { writeAuditLog } from "../../utils/audit";
import { clientScopeFilter, assertServiceAccess, assertOwnClient, resolveClientId } from "../../middleware/rbac";
import { deriveDueStatus } from "../../utils/status";
import { computeNextDue, computeGenerationDate, frequencyToDays, forecastMeterDue, type TimeScheduleConfig } from "../../lib/planSchedule";
import { nextClientMaintenanceOrderNumber, nextClientMaintenancePlanCode } from "../../utils/sequence";
import { reserveSparePart } from "../../lib/inventory";

const detailInclude = {
  client: { select: { id: true, companyName: true, tradeName: true } },
  instrument: { select: { id: true, type: true, model: true, serialNumber: true, tag: true, description: true, criticality: true } },
  meter: { select: { id: true, name: true, unit: true, currentValue: true } },
  responsible: { select: { id: true, name: true } },
  specialty: { select: { id: true, name: true } },
  checklistTemplate: { orderBy: { sortOrder: "asc" as const } },
  template: { select: { id: true, name: true } },
  parts: { include: { sparePart: { select: { id: true, name: true, code: true, unit: true, stockQty: true, reservedQty: true } } } },
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

  // Datas derivadas do agendamento - calculadas na hora, nunca gravadas, para nao existir
  // uma copia que envelhece.
  const nextGenerationDate = plan.nextDueDate
    ? computeGenerationDate(plan.nextDueDate, plan.generateAdvanceDays)
    : null;

  // Previsao por consumo medio: so faz sentido no disparo por medidor.
  let meterForecast = null;
  if (plan.meterId && plan.meterInterval != null) {
    const readings = await prisma.meterReading.findMany({
      where: { meterId: plan.meterId },
      orderBy: { readAt: "desc" },
      take: 30,
      select: { value: true, readAt: true },
    });
    const meter = await prisma.meter.findUnique({ where: { id: plan.meterId }, select: { currentValue: true } });
    meterForecast = forecastMeterDue(
      readings,
      plan.meterBaseReading ?? plan.lastMeterAtGeneration,
      plan.meterInterval,
      meter?.currentValue ?? 0,
    );
  }

  res.json({ ...withDerivedStatus(plan), schedule: { nextGenerationDate, meterForecast } });
});

const checklistItemSchema = z.object({ description: z.string().min(1) });
const planPartSchema = z.object({ sparePartId: z.string().uuid(), quantity: z.coerce.number().int().positive() });

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
  status: z.nativeEnum(MaintenancePlanStatus).optional(),
  planType: z.nativeEnum(MaintenancePlanType).optional(),
  scope: z.nativeEnum(MaintenancePlanScope).optional(),
  defaultPriority: z.nativeEnum(MaintenancePriority).optional(),
  specialtyId: z.string().uuid().nullish(),
  responsibleId: z.string().uuid().nullish(),
  // Agendamento
  frequencyUnit: z.nativeEnum(MaintenanceFrequencyUnit).optional(),
  frequencyEvery: z.coerce.number().int().positive().nullish(),
  baseDate: z.coerce.date().nullish(),
  dayOfWeek: z.coerce.number().int().min(0).max(6).nullish(),
  dayOfMonth: z.coerce.number().int().min(1).max(31).nullish(),
  monthOfYear: z.coerce.number().int().min(1).max(12).nullish(),
  operationalCalendar: z.nativeEnum(OperationalCalendar).optional(),
  blockedDates: z.array(z.coerce.date()).optional(),
  generateAdvanceDays: z.coerce.number().int().nonnegative().nullish(),
  meterBaseReading: z.coerce.number().nullish(),
  generateAdvanceMeterUnits: z.coerce.number().nonnegative().nullish(),
  toleranceMeterBefore: z.coerce.number().nonnegative().nullish(),
  toleranceMeterAfter: z.coerce.number().nonnegative().nullish(),
  meterResetRule: z.nativeEnum(MeterResetRule).optional(),
  triggerMode: z.nativeEnum(MaintenanceTriggerMode).optional(),
  conditionMeterId: z.string().uuid().nullish(),
  checklistTemplate: z.array(checklistItemSchema).optional(),
  // Tolerancia informativa (nao reescreve deriveDueStatus, so exibida na tela do plano);
  // procedimento/HH prevista/materiais previstos alimentam o backlog do PCM e a OS gerada.
  toleranceDaysBefore: z.coerce.number().int().nonnegative().nullish(),
  toleranceDaysAfter: z.coerce.number().int().nonnegative().nullish(),
  procedure: z.string().nullish(),
  estimatedLaborHours: z.coerce.number().nonnegative().nullish(),
  templateId: z.string().uuid().nullish(),
  parts: z.array(planPartSchema).optional(),
});

/** Monta a config de calendario que o motor de agendamento espera. */
function scheduleConfigOf(plan: {
  frequencyUnit: MaintenanceFrequencyUnit;
  frequencyEvery: number | null;
  frequencyDays: number | null;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  monthOfYear: number | null;
  operationalCalendar: OperationalCalendar;
  blockedDates: Date[];
}): TimeScheduleConfig {
  return {
    frequencyUnit: plan.frequencyUnit,
    frequencyEvery: plan.frequencyEvery,
    frequencyDays: plan.frequencyDays,
    dayOfWeek: plan.dayOfWeek,
    dayOfMonth: plan.dayOfMonth,
    monthOfYear: plan.monthOfYear,
    operationalCalendar: plan.operationalCalendar,
    blockedDates: plan.blockedDates ?? [],
  };
}

/** Campos cuja mudanca desloca o ciclo do plano - o pedido e' que cada alteracao desses
 * fique registrada na auditoria e recalcule o vencimento sem apagar o historico. */
const CAMPOS_DE_AGENDAMENTO = [
  "triggerType", "frequencyUnit", "frequencyEvery", "frequencyDays", "baseDate", "dayOfWeek",
  "dayOfMonth", "monthOfYear", "operationalCalendar", "generateAdvanceDays", "toleranceDaysBefore",
  "toleranceDaysAfter", "meterId", "meterInterval", "meterBaseReading", "toleranceMeterBefore",
  "toleranceMeterAfter", "meterResetRule", "triggerMode", "conditionMeterId",
] as const;

async function assertPartsBelongToClient(parts: { sparePartId: string }[], clientId: string) {
  const ids = [...new Set(parts.map((p) => p.sparePartId))];
  const found = await prisma.sparePart.findMany({ where: { id: { in: ids }, deletedAt: null }, select: { id: true, clientId: true } });
  if (found.length !== ids.length) throw new ValidationError("Uma das pecas informadas nao existe.");
  if (found.some((p) => p.clientId !== clientId)) throw new ValidationError("Uma das pecas informadas pertence a outra empresa.");
}

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

  if (data.parts?.length) await assertPartsBelongToClient(data.parts, clientId);

  const { checklistTemplate, parts, ...planData } = data;
  // Periodicidade em dias e' derivada da unidade escolhida - "a cada 3 meses" vira 90
  // dias para quem ainda pensa em dias, sem o usuario ter que fazer essa conta.
  const frequencyUnit = planData.frequencyUnit ?? "DAY";
  const frequencyEvery = planData.frequencyEvery ?? planData.frequencyDays ?? null;
  const frequencyDays = frequencyEvery ? frequencyToDays(frequencyUnit, frequencyEvery) : null;
  const baseDate = planData.baseDate ?? new Date();

  const nextDueDate =
    data.triggerType === "TIME"
      ? computeNextDue(baseDate, {
          frequencyUnit,
          frequencyEvery,
          frequencyDays,
          dayOfWeek: planData.dayOfWeek ?? null,
          dayOfMonth: planData.dayOfMonth ?? null,
          monthOfYear: planData.monthOfYear ?? null,
          operationalCalendar: planData.operationalCalendar ?? "ALL_DAYS",
          blockedDates: planData.blockedDates ?? [],
        })
      : null;

  const code = await nextClientMaintenancePlanCode(clientId);
  // "active" continua no banco por compatibilidade, mas quem manda e' o status: manter
  // os dois em sincronia evita um plano Suspenso continuar gerando OS.
  const status = planData.status ?? "ACTIVE";

  const plan = await prisma.maintenancePlan.create({
    data: {
      ...planData,
      code,
      status,
      active: status === "ACTIVE",
      clientId,
      frequencyUnit,
      frequencyEvery,
      frequencyDays,
      baseDate,
      nextDueDate,
      createdById: req.user?.sub,
      checklistTemplate: { create: (checklistTemplate ?? []).map((c, i) => ({ description: c.description, sortOrder: i })) },
      parts: { create: (parts ?? []).map((p) => ({ sparePartId: p.sparePartId, quantity: p.quantity })) },
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

  if (data.parts) await assertPartsBelongToClient(data.parts, existing.clientId);

  const { checklistTemplate, parts, ...planData } = data;
  if (req.user?.role === "CLIENT") delete planData.clientId;
  const triggerType = data.triggerType ?? existing.triggerType;
  const frequencyUnit = planData.frequencyUnit ?? existing.frequencyUnit;
  const frequencyEvery = planData.frequencyEvery ?? existing.frequencyEvery ?? existing.frequencyDays;
  const frequencyDays = frequencyEvery ? frequencyToDays(frequencyUnit, frequencyEvery) : existing.frequencyDays;
  const baseDate = planData.baseDate ?? existing.baseDate ?? existing.createdAt;

  // Mudou algo que desloca o ciclo? Entao recalcula o vencimento a partir da data-base -
  // e registra o que mudou, sem apagar o historico anterior do plano.
  const mudancasDeAgendamento = CAMPOS_DE_AGENDAMENTO.filter((campo) => {
    const novo = (planData as Record<string, unknown>)[campo];
    if (novo === undefined) return false;
    const atual = (existing as Record<string, unknown>)[campo];
    if (novo instanceof Date && atual instanceof Date) return novo.getTime() !== atual.getTime();
    return novo !== atual;
  });

  const nextDueDate =
    triggerType === "TIME" && frequencyEvery
      ? computeNextDue(baseDate, {
          frequencyUnit,
          frequencyEvery,
          frequencyDays,
          dayOfWeek: planData.dayOfWeek ?? existing.dayOfWeek,
          dayOfMonth: planData.dayOfMonth ?? existing.dayOfMonth,
          monthOfYear: planData.monthOfYear ?? existing.monthOfYear,
          operationalCalendar: planData.operationalCalendar ?? existing.operationalCalendar,
          blockedDates: planData.blockedDates ?? existing.blockedDates,
        })
      : existing.nextDueDate;

  const statusFinal = planData.status ?? existing.status;

  const plan = await prisma.maintenancePlan.update({
    where: { id: existing.id },
    data: {
      ...planData,
      status: statusFinal,
      active: statusFinal === "ACTIVE",
      frequencyUnit,
      frequencyEvery,
      frequencyDays,
      baseDate,
      nextDueDate,
      ...(checklistTemplate
        ? {
            checklistTemplate: {
              deleteMany: {},
              create: checklistTemplate.map((c, i) => ({ description: c.description, sortOrder: i })),
            },
          }
        : {}),
      ...(parts
        ? {
            parts: {
              deleteMany: {},
              create: parts.map((p) => ({ sparePartId: p.sparePartId, quantity: p.quantity })),
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

  if (mudancasDeAgendamento.length > 0) {
    await writeAuditLog({
      userId: req.user?.sub,
      action: "UPDATE",
      entityType: "MaintenancePlan",
      entityId: plan.id,
      description:
        `Agendamento do plano ${plan.code ?? plan.name} alterado (${mudancasDeAgendamento.join(", ")}). ` +
        `Proximo vencimento recalculado para ${plan.nextDueDate ? plan.nextDueDate.toISOString().slice(0, 10) : "nao aplicavel"}.`,
    });
  }

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
    include: { checklistTemplate: { orderBy: { sortOrder: "asc" } }, meter: true, parts: true },
  });
  if (!plan) throw new NotFoundError("Plano de manutencao");
  assertOwnClient(req, plan.clientId);
  if (plan.status !== "ACTIVE") {
    const motivo: Record<string, string> = {
      DRAFT: "Este plano ainda e' um rascunho.",
      SUSPENDED: "Este plano esta suspenso.",
      CLOSED: "Este plano foi encerrado.",
    };
    throw new ValidationError(`${motivo[plan.status] ?? "Plano inativo."} So plano Ativo gera ordem de manutencao.`);
  }

  const number = await nextClientMaintenanceOrderNumber(plan.clientId);

  const workOrder = await prisma.maintenanceWorkOrder.create({
    data: {
      number,
      clientId: plan.clientId,
      instrumentId: plan.instrumentId,
      planId: plan.id,
      type: "PREVENTIVE",
      status: "OPEN",
      priority: plan.defaultPriority,
      description: plan.name,
      technicianId: plan.responsibleId,
      meterReadingAtExecution: plan.meter?.currentValue,
      laborHours: plan.estimatedLaborHours,
      createdById: req.user?.sub,
      checklist: { create: plan.checklistTemplate.map((c, i) => ({ description: c.description, sortOrder: i })) },
    },
  });

  await prisma.maintenancePlan.update({
    where: { id: plan.id },
    data: {
      lastGeneratedAt: new Date(),
      lastMeterAtGeneration: plan.meter?.currentValue,
      // O proximo ciclo conta a partir do vencimento que acabou de ser atendido (nao de
      // hoje): plano atrasado nao empurra o calendario inteiro para frente.
      baseDate: plan.nextDueDate ?? new Date(),
      nextDueDate:
        plan.triggerType === "TIME" && plan.frequencyEvery
          ? computeNextDue(plan.nextDueDate ?? new Date(), scheduleConfigOf(plan))
          : plan.nextDueDate,
    },
  });

  // Reserva melhor-esforco dos materiais previstos no plano: falta de saldo nao impede a
  // OS de ser criada, so deixa aquele item sem reserva (o tecnico ve isso na tela da OS).
  for (const part of plan.parts) {
    try {
      await reserveSparePart({ sparePartId: part.sparePartId, workOrderId: workOrder.id, quantity: part.quantity, createdById: req.user?.sub });
    } catch {
      // saldo insuficiente - segue sem reservar este item
    }
  }

  await writeAuditLog({
    userId: req.user?.sub,
    action: "CREATE",
    entityType: "MaintenanceWorkOrder",
    entityId: workOrder.id,
    description: `OS ${workOrder.number} gerada a partir do plano "${plan.name}"`,
  });

  res.status(201).json(workOrder);
});
