import type { Request, Response } from "express";
import { z } from "zod";
import { MaintenanceTriggerType, MaintenancePlanStatus, MaintenancePlanType, MaintenancePlanScope, MaintenancePriority, MaintenanceFrequencyUnit, OperationalCalendar, MeterResetRule, MaintenanceTriggerMode, MaintenanceOrderStatus, MaterialPolicy, ChecklistResponseType, LubricationMethod } from "@prisma/client";
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
  instrument: { select: { id: true, type: true, model: true, serialNumber: true, tag: true, description: true, criticality: true, costCenterId: true } },
  meter: { select: { id: true, name: true, unit: true, currentValue: true } },
  responsible: { select: { id: true, name: true } },
  specialty: { select: { id: true, name: true } },
  checklistTemplate: { orderBy: { sortOrder: "asc" as const } },
  template: { select: { id: true, name: true } },
  parts: {
    include: {
      sparePart: { select: { id: true, name: true, code: true, unit: true, stockQty: true, reservedQty: true } },
      alternativeSparePart: { select: { id: true, name: true, code: true, unit: true, stockQty: true, reservedQty: true } },
    },
  },
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

const checklistItemSchema = z.object({
  description: z.string().min(1),
  section: z.string().nullish(),
  required: z.boolean().optional(),
  responseType: z.nativeEnum(ChecklistResponseType).optional(),
  unit: z.string().nullish(),
  minValue: z.coerce.number().nullish(),
  maxValue: z.coerce.number().nullish(),
  targetValue: z.coerce.number().nullish(),
  requiresPhoto: z.boolean().optional(),
  reference: z.string().nullish(),
  // Tempo esperado nesta operacao - somado, da a duracao estimada do servico.
  estimatedMinutes: z.coerce.number().int().nonnegative().nullish(),
});
const planPartSchema = z.object({
  sparePartId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  required: z.boolean().optional(),
  alternativeSparePartId: z.string().uuid().nullish(),
  suggestedSupplier: z.string().nullish(),
  notes: z.string().nullish(),
});

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
  // Como a OS gerada nasce
  initialWorkOrderStatus: z.nativeEnum(MaintenanceOrderStatus).optional(),
  requiresShutdown: z.boolean().optional(),
  estimatedShutdownHours: z.coerce.number().nonnegative().nullish(),
  requiresOperationalRelease: z.boolean().optional(),
  requiresLoto: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
  groupWorkOrder: z.boolean().optional(),
  materialPolicy: z.nativeEnum(MaterialPolicy).optional(),
  checklistTemplate: z.array(checklistItemSchema).optional(),
  // Tolerancia informativa (nao reescreve deriveDueStatus, so exibida na tela do plano);
  // procedimento/HH prevista/materiais previstos alimentam o backlog do PCM e a OS gerada.
  toleranceDaysBefore: z.coerce.number().int().nonnegative().nullish(),
  toleranceDaysAfter: z.coerce.number().int().nonnegative().nullish(),
  procedure: z.string().nullish(),
  estimatedLaborHours: z.coerce.number().nonnegative().nullish(),
  // Procedimento/cuidados do plano - vira a descricao da OS gerada.
  instructions: z.string().nullish(),
  // Lubrificacao: so faz sentido em plano do tipo Lubrificacao (validado na escrita).
  lubricantSparePartId: z.string().uuid().nullish(),
  lubricationPoints: z.coerce.number().int().positive().nullish(),
  lubricantQtyPerPoint: z.coerce.number().positive().nullish(),
  lubricationMethod: z.nativeEnum(LubricationMethod).nullish(),
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

/** Os campos de lubrificacao so descrevem alguma coisa num plano de lubrificacao; noutro
 * tipo eles ficariam guardados sem significado nenhum. */
function assertLubrificacaoCoerente(
  planType: MaintenancePlanType | undefined,
  dados: { lubricantSparePartId?: string | null; lubricationPoints?: number | null; lubricantQtyPerPoint?: number | null; lubricationMethod?: LubricationMethod | null },
) {
  const preencheu =
    !!dados.lubricantSparePartId || dados.lubricationPoints != null || dados.lubricantQtyPerPoint != null || !!dados.lubricationMethod;
  if (preencheu && planType && planType !== "LUBRICATION") {
    throw new ValidationError("Os dados de lubrificacao so se aplicam a plano do tipo Lubrificacao.");
  }
}

export const createMaintenancePlan = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = planSchema.parse(req.body);
  const clientId = resolveClientId(req, data.clientId);
  // A periodicidade agora vem como "a cada X <unidade>"; frequencyDays e' o valor derivado,
  // mantido para os planos antigos que so tinham dias.
  if (data.triggerType === "TIME" && !data.frequencyEvery && !data.frequencyDays) {
    throw new ValidationError("Informe a periodicidade para um plano por tempo.");
  }
  if (data.triggerType === "METER" && (!data.meterId || !data.meterInterval)) {
    throw new ValidationError("Informe o medidor e o intervalo para um plano por medidor.");
  }

  const instrument = await prisma.instrument.findFirst({ where: { id: data.instrumentId, deletedAt: null }, select: { clientId: true } });
  if (!instrument) throw new NotFoundError("Ativo");
  if (instrument.clientId !== clientId) throw new ValidationError("Esse ativo pertence a outra empresa.");

  if (data.parts?.length) await assertPartsBelongToClient(data.parts, clientId);
  assertLubrificacaoCoerente(data.planType, data);

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
      checklistTemplate: { create: (checklistTemplate ?? []).map((c, i) => ({ ...c, sortOrder: i })) },
      parts: { create: (parts ?? []).map((p) => ({ ...p })) },
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
              create: checklistTemplate.map((c, i) => ({ ...c, sortOrder: i })),
            },
          }
        : {}),
      ...(parts
        ? {
            parts: {
              deleteMany: {},
              create: parts.map((p) => ({ ...p })),
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
/**
 * Gera a Ordem de Manutencao de um plano: copia checklist e procedimento, resolve o
 * material conforme a politica, cria a OS e avanca o ciclo do plano.
 *
 * Usada nos dois caminhos - o botao "Gerar OS" e o disparo automatico quando a
 * antecedencia e' atingida - para que os dois facam exatamente a mesma coisa. Quando
 * chamada pelo automatico (`automatica`), devolve o motivo em vez de lancar erro: um plano
 * que nao pode gerar nao pode derrubar a rodada dos outros.
 */
async function criarOsDoPlano(planId: string, opcoes: { userId?: string; automatica?: boolean }) {
  const plan = await prisma.maintenancePlan.findFirst({
    where: { id: planId, deletedAt: null },
    include: {
      checklistTemplate: { orderBy: { sortOrder: "asc" } },
      meter: true,
      parts: true,
      instrument: { select: { costCenterId: true } },
    },
  });
  if (!plan) throw new NotFoundError("Plano de manutencao");
  if (plan.status !== "ACTIVE") {
    const motivo: Record<string, string> = {
      DRAFT: "Este plano ainda e' um rascunho.",
      SUSPENDED: "Este plano esta suspenso.",
      CLOSED: "Este plano foi encerrado.",
    };
    throw new ValidationError(`${motivo[plan.status] ?? "Plano inativo."} So plano Ativo gera ordem de manutencao.`);
  }

  // Uma OS por ciclo. Sem isso, o disparo automatico rodando de hora em hora criaria uma
  // OS nova a cada passada enquanto o vencimento nao fosse atendido - e o botao "Gerar OS"
  // clicado duas vezes faria o mesmo. O ciclo e' identificado pela data programada.
  if (plan.nextDueDate) {
    const jaExiste = await prisma.maintenanceWorkOrder.findFirst({
      where: {
        planId: plan.id,
        deletedAt: null,
        status: { notIn: ["COMPLETED", "CANCELED"] },
        scheduledDate: plan.nextDueDate,
      },
      select: { number: true },
    });
    if (jaExiste) {
      throw new ValidationError(`A OS ${jaExiste.number} ja atende o vencimento de ${plan.nextDueDate.toLocaleDateString("pt-BR")}. Conclua ou cancele antes de gerar outra.`);
    }
  }

  /**
   * Material antes de criar a OS: a politica do plano pode ate impedir a geracao, entao
   * a disponibilidade e' checada aqui. Para cada item previsto tenta o principal e, se
   * faltar, o substituto - e guarda o motivo quando nenhum dos dois da.
   */
  const planoDeMaterial: {
    partId: string;
    sparePartId: string;
    quantity: number;
    required: boolean;
    reason: string | null;
  }[] = [];

  for (const part of plan.parts) {
    const candidatos = [part.sparePartId, part.alternativeSparePartId].filter(Boolean) as string[];
    let escolhido: string | null = null;
    let motivo: string | null = null;

    for (const id of candidatos) {
      const peca = await prisma.sparePart.findFirst({
        where: { id, deletedAt: null },
        select: { id: true, name: true, stockQty: true, reservedQty: true, active: true },
      });
      if (!peca) {
        motivo = "Peca nao encontrada no almoxarifado.";
        continue;
      }
      if (!peca.active) {
        motivo = `Peca "${peca.name}" esta inativa.`;
        continue;
      }
      const disponivel = peca.stockQty - peca.reservedQty;
      if (disponivel < part.quantity) {
        motivo = `Saldo insuficiente de "${peca.name}": precisa de ${part.quantity}, disponivel ${disponivel}.`;
        continue;
      }
      escolhido = peca.id;
      motivo = id === part.alternativeSparePartId ? "Reservado o substituto - o principal estava sem saldo." : null;
      break;
    }

    planoDeMaterial.push({
      partId: part.id,
      sparePartId: escolhido ?? part.sparePartId,
      quantity: part.quantity,
      required: part.required,
      reason: escolhido ? motivo : (motivo ?? "Sem saldo disponivel."),
    });
    if (!escolhido) planoDeMaterial[planoDeMaterial.length - 1].sparePartId = part.sparePartId;
  }

  const faltamObrigatorios = planoDeMaterial.filter(
    (m) => m.required && m.reason != null && !m.reason.startsWith("Reservado o substituto"),
  );

  // "Nao gerar" e' a unica politica que recusa - e diz exatamente o que falta, em vez de
  // falhar em silencio.
  if (plan.materialPolicy === "DO_NOT_GENERATE" && faltamObrigatorios.length > 0) {
    throw new ValidationError(
      `OS nao gerada por falta de material obrigatorio: ${faltamObrigatorios.map((m) => m.reason).join(" ")}`,
    );
  }

  const number = await nextClientMaintenanceOrderNumber(plan.clientId);

  // Falta material obrigatorio e a politica manda segurar? A OS ja nasce em "Aguardando
  // material", em vez de entrar na fila como se estivesse pronta para executar.
  const statusInicial =
    plan.materialPolicy === "BLOCK_AWAITING_MATERIAL" && faltamObrigatorios.length > 0
      ? "AWAITING_MATERIAL"
      : plan.initialWorkOrderStatus;

  const observacoesDeGeracao = [
    plan.requiresShutdown
      ? `Requer parada de maquina${plan.estimatedShutdownHours ? ` (~${plan.estimatedShutdownHours}h)` : ""}.`
      : null,
    plan.requiresOperationalRelease ? "Requer liberacao operacional." : null,
    plan.requiresLoto ? "Requer bloqueio/LOTO ou permissao de trabalho." : null,
    plan.requiresApproval ? "Requer aprovacao antes da execucao." : null,
    faltamObrigatorios.length > 0 ? `Material pendente: ${faltamObrigatorios.map((m) => m.reason).join(" ")}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const workOrder = await prisma.maintenanceWorkOrder.create({
    data: {
      number,
      clientId: plan.clientId,
      instrumentId: plan.instrumentId,
      planId: plan.id,
      type: "PREVENTIVE",
      status: statusInicial,
      priority: plan.defaultPriority,
      title: plan.name,
      description: plan.instructions?.trim() || plan.name,
      // Rateio: cai no centro de custo do ativo, como qualquer outra OS dele.
      costCenterId: plan.instrument?.costCenterId ?? null,
      technicianId: plan.responsibleId,
      // Data programada sugerida: o vencimento do ciclo que esta sendo atendido.
      scheduledDate: plan.nextDueDate,
      meterReadingAtExecution: plan.meter?.currentValue,
      // Estimativa do plano e' previsao, nao apontamento: laborHours guarda o que foi de
      // fato trabalhado e nasce vazio (antes ele ja vinha preenchido com a estimativa, o
      // que dava a OS por executada antes de alguem encostar nela).
      estimatedHours: plan.estimatedLaborHours,
      observations: observacoesDeGeracao || null,
      createdById: opcoes.userId,
      // O item da OS leva a regra junto (tipo de resposta, faixa, foto): se o plano for
      // editado depois, a OS ja executada continua contando a historia que valia na epoca.
      checklist: {
        create: plan.checklistTemplate.map((c, i) => ({
          description: c.description,
          sortOrder: i,
          section: c.section,
          required: c.required,
          responseType: c.responseType,
          unit: c.unit,
          minValue: c.minValue,
          maxValue: c.maxValue,
          targetValue: c.targetValue,
          requiresPhoto: c.requiresPhoto,
          estimatedMinutes: c.estimatedMinutes,
          reference: c.reference,
        })),
      },
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

  // Reserva conforme a politica do plano. ALERT_ONLY gera sem reservar; as demais tentam
  // reservar. Em todos os casos fica registrado o que foi (ou nao foi) reservado e por que -
  // o planejador nao descobre a falta so na hora da execucao.
  const reservaAtiva = plan.materialPolicy !== "ALERT_ONLY";
  for (const item of planoDeMaterial) {
    let reservou = false;
    let motivo = item.reason;

    if (reservaAtiva && (motivo == null || motivo.startsWith("Reservado o substituto"))) {
      try {
        await reserveSparePart({
          sparePartId: item.sparePartId,
          workOrderId: workOrder.id,
          quantity: item.quantity,
          createdById: opcoes.userId,
        });
        reservou = true;
      } catch (erro) {
        motivo = erro instanceof Error ? erro.message : "Falha ao reservar.";
      }
    } else if (!reservaAtiva) {
      motivo = "Politica do plano: gerar sem reservar, com alerta.";
    }

    await prisma.workOrderMaterialLog.create({
      data: {
        workOrderId: workOrder.id,
        sparePartId: item.sparePartId,
        quantityNeeded: item.quantity,
        reserved: reservou,
        reason: reservou && !motivo ? null : motivo,
      },
    });
  }

  await writeAuditLog({
    userId: opcoes.userId,
    action: "CREATE",
    entityType: "MaintenanceWorkOrder",
    entityId: workOrder.id,
    description: `OS ${workOrder.number} gerada a partir do plano "${plan.name}"`,
  });

  return workOrder;
}


/** Ponto de entrada do disparo automatico - o mesmo caminho do botao, sem HTTP no meio. */
export function criarOsDoPlanoParaAutomacao(planId: string, opcoes: { userId?: string }) {
  return criarOsDoPlano(planId, { ...opcoes, automatica: true });
}

/** Endpoint da rodada de geracao: util para disparar a mao ou por um cron externo. */
export const runPlanGeneration = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  // CLIENT so dispara a rodada da propria empresa; a equipe interna pode rodar tudo.
  const escopo = clientScopeFilter(req);
  const { gerarOsVencidas } = await import("../../lib/planRunner.js");
  const resultado = await gerarOsVencidas({ clientId: escopo.clientId, userId: req.user?.sub });
  res.json(resultado);
});

/** Botao "Gerar OS" do plano. */
export const generateWorkOrderFromPlan = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const plan = await prisma.maintenancePlan.findFirst({
    where: { id: req.params.id, deletedAt: null },
    select: { clientId: true },
  });
  if (!plan) throw new NotFoundError("Plano de manutencao");
  assertOwnClient(req, plan.clientId);

  const workOrder = await criarOsDoPlano(req.params.id, { userId: req.user?.sub });
  res.status(201).json(workOrder);
});

/**
 * Indicadores do plano: cumprimento, atraso, HH e custo planejado x realizado, consumo de
 * material e falhas encontradas durante a preventiva. Tudo calculado a partir das OS que o
 * plano gerou - nada guardado em campo separado, que envelheceria.
 */
export const getMaintenancePlanIndicators = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const plan = await prisma.maintenancePlan.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    select: {
      id: true,
      estimatedLaborHours: true,
      nextDueDate: true,
      lastExecutionAt: true,
      generateAdvanceDays: true,
      parts: { select: { quantity: true, sparePart: { select: { unitCost: true } } } },
    },
  });
  if (!plan) throw new NotFoundError("Plano de manutencao");

  // Custo planejado de UM ciclo, so a parte que tem base real: o material previsto pelo
  // custo unitario vigente de cada peca. Mao de obra planejada ficaria de fora porque o
  // plano guarda a HH prevista, mas nao um valor/hora - e inventar uma taxa media faria o
  // "planejado x realizado" comparar um numero medido com um chute. A HH prevista x
  // realizada continua sendo comparada em horas, logo acima.
  //
  // Peca sem custo unitario cadastrado zera a base: nesse caso devolve null, porque um
  // "R$ 0,00 planejado" ao lado de um custo real faria todo plano parecer estourado.
  const custoPlanejadoPorCiclo = plan.parts.length
    ? plan.parts.reduce<number | null>((soma, p) => {
        if (soma === null) return null;
        const unitario = p.sparePart?.unitCost;
        return unitario == null ? null : soma + unitario * p.quantity;
      }, 0)
    : null;

  const workOrders = await prisma.maintenanceWorkOrder.findMany({
    where: { planId: plan.id, deletedAt: null },
    select: {
      id: true,
      number: true,
      status: true,
      scheduledDate: true,
      completedAt: true,
      createdAt: true,
      partsUsed: { select: { quantity: true, unitCost: true, sparePart: { select: { name: true, unit: true } } } },
      laborEntries: { select: { hours: true, hourlyRateSnapshot: true } },
      thirdPartyServices: { select: { cost: true } },
      spawnedWorkOrders: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const concluidas = workOrders.filter((w) => w.status === "COMPLETED" && w.completedAt);
  const noPrazo = concluidas.filter((w) => !w.scheduledDate || (w.completedAt && w.completedAt <= w.scheduledDate));
  const emAberto = workOrders.filter((w) => !["COMPLETED", "CANCELED"].includes(w.status));
  const agora = new Date();
  const atrasadas = emAberto.filter((w) => w.scheduledDate && w.scheduledDate < agora);

  const hhRealizada = concluidas.reduce((soma, w) => soma + w.laborEntries.reduce((t, l) => t + l.hours, 0), 0);
  const custoPecas = concluidas.reduce(
    (soma, w) => soma + w.partsUsed.reduce((t, x) => t + (x.unitCost ?? 0) * x.quantity, 0),
    0,
  );
  const custoMaoDeObra = concluidas.reduce(
    (soma, w) => soma + w.laborEntries.reduce((t, l) => t + (l.hourlyRateSnapshot ?? 0) * l.hours, 0),
    0,
  );
  const custoTerceiros = concluidas.reduce((soma, w) => soma + w.thirdPartyServices.reduce((t, x) => t + x.cost, 0), 0);

  const consumo = new Map<string, { name: string; unit: string; quantity: number }>();
  for (const w of concluidas) {
    for (const x of w.partsUsed) {
      const chave = x.sparePart?.name ?? "Peca";
      const atual = consumo.get(chave) ?? { name: chave, unit: x.sparePart?.unit ?? "un", quantity: 0 };
      atual.quantity += x.quantity;
      consumo.set(chave, atual);
    }
  }

  // Falhas encontradas na preventiva = corretivas que nasceram de anomalia no checklist
  // destas OS. E' o indicador que diz se a preventiva esta pegando problema de verdade.
  const falhasEncontradas = workOrders.reduce((soma, w) => soma + w.spawnedWorkOrders.length, 0);

  res.json({
    lastExecutionAt: plan.lastExecutionAt,
    nextDueDate: plan.nextDueDate,
    nextGenerationDate: plan.nextDueDate ? computeGenerationDate(plan.nextDueDate, plan.generateAdvanceDays) : null,
    totals: {
      generated: workOrders.length,
      completed: concluidas.length,
      open: emAberto.length,
      overdue: atrasadas.length,
    },
    // Sem OS concluida nao ha cumprimento - null vira "Dados insuficientes" na tela, em
    // vez de um 0% que pareceria desempenho ruim.
    compliancePct: concluidas.length > 0 ? Math.round((noPrazo.length / concluidas.length) * 100) : null,
    laborHours: {
      planned: plan.estimatedLaborHours != null ? plan.estimatedLaborHours * concluidas.length : null,
      actual: concluidas.length > 0 ? Math.round(hhRealizada * 10) / 10 : null,
    },
    cost: {
      parts: custoPecas,
      labor: custoMaoDeObra,
      thirdParty: custoTerceiros,
      total: custoPecas + custoMaoDeObra + custoTerceiros,
      tracked: concluidas.length > 0,
      // Planejado x realizado precisa comparar o mesmo numero de execucoes: o custo de um
      // ciclo multiplicado pelas OS concluidas. So material - ver o comentario acima.
      plannedPerCycle: custoPlanejadoPorCiclo,
      planned: custoPlanejadoPorCiclo != null ? custoPlanejadoPorCiclo * concluidas.length : null,
      plannedCovers: "material" as const,
    },
    materialUsage: [...consumo.values()].sort((a, b) => b.quantity - a.quantity),
    failuresFound: falhasEncontradas,
    workOrders: workOrders.slice(0, 20).map((w) => ({
      id: w.id,
      number: w.number,
      status: w.status,
      scheduledDate: w.scheduledDate,
      completedAt: w.completedAt,
      createdAt: w.createdAt,
    })),
  });
});

/** Duplica o plano: copia tudo menos codigo, historico e datas de execucao. Nasce como
 * Rascunho, para o usuario ajustar o que muda antes de ativar. */
export const duplicateMaintenancePlan = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const origem = await prisma.maintenancePlan.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: { checklistTemplate: { orderBy: { sortOrder: "asc" } }, parts: true },
  });
  if (!origem) throw new NotFoundError("Plano de manutencao");
  assertOwnClient(req, origem.clientId);

  const {
    id: _id,
    code: _code,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    deletedAt: _deletedAt,
    lastGeneratedAt: _lastGeneratedAt,
    lastExecutionAt: _lastExecutionAt,
    lastMeterAtGeneration: _lastMeter,
    checklistTemplate,
    parts,
    ...dados
  } = origem;

  const novoCodigo = await nextClientMaintenancePlanCode(origem.clientId);

  const copia = await prisma.maintenancePlan.create({
    data: {
      ...dados,
      code: novoCodigo,
      name: origem.name + " (copia)",
      status: "DRAFT",
      active: false,
      createdById: req.user?.sub,
      checklistTemplate: { create: checklistTemplate.map(({ id: _i, planId: _p, ...c }) => c) },
      parts: { create: parts.map(({ id: _i, planId: _p, ...x }) => x) },
    },
    include: detailInclude,
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "CREATE",
    entityType: "MaintenancePlan",
    entityId: copia.id,
    description: "Plano " + copia.code + " criado como copia de " + (origem.code ?? origem.name),
  });

  res.status(201).json(copia);
});
