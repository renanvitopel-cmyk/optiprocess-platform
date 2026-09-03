import type { Request, Response } from "express";
import { z } from "zod";
import { MaintenanceTriggerType } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { NotFoundError, ForbiddenError, ValidationError } from "../../utils/errors";
import { assertServiceAccess, assertOwnClient, resolveClientId } from "../../middleware/rbac";
import { writeAuditLog } from "../../utils/audit";
import { computeNextDueDateFromDays } from "../../utils/status";

/** Mesmo padrao de FailureCode/AssetType: catalogo padrao da OptiProcess (clientId nulo)
 * somado ao que o proprio cliente cadastrou como reutilizavel. */
function scopeFilter(req: Request, clientId?: string) {
  if (req.user?.role === "CLIENT") {
    if (!req.user.clientId) throw new ForbiddenError();
    return { OR: [{ clientId: null }, { clientId: req.user.clientId }] };
  }
  if (clientId) return { OR: [{ clientId: null }, { clientId }] };
  return {};
}

export const listMaintenancePlanTemplates = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const { active, clientId } = req.query as { active?: string; clientId?: string };
  const templates = await prisma.maintenancePlanTemplate.findMany({
    where: {
      ...scopeFilter(req, clientId),
      ...(active !== undefined ? { active: active === "true" } : {}),
    },
    orderBy: { name: "asc" },
    include: { checklistItems: { orderBy: { sortOrder: "asc" } } },
  });
  res.json(templates);
});

export const getMaintenancePlanTemplate = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const template = await prisma.maintenancePlanTemplate.findFirst({
    where: { id: req.params.id, ...scopeFilter(req) },
    include: { checklistItems: { orderBy: { sortOrder: "asc" } } },
  });
  if (!template) throw new NotFoundError("Modelo de plano");
  res.json(template);
});

const checklistItemSchema = z.object({ description: z.string().min(1) });

const templateSchema = z.object({
  clientId: z.string().uuid().nullish(),
  name: z.string().min(2, "Informe o nome do modelo."),
  applicableAssetFamily: z.string().nullish(),
  triggerType: z.nativeEnum(MaintenanceTriggerType),
  frequencyDays: z.coerce.number().int().positive().nullish(),
  meterInterval: z.coerce.number().positive().nullish(),
  toleranceDaysBefore: z.coerce.number().int().nonnegative().nullish(),
  toleranceDaysAfter: z.coerce.number().int().nonnegative().nullish(),
  procedure: z.string().nullish(),
  estimatedLaborHours: z.coerce.number().nonnegative().nullish(),
  checklistItems: z.array(checklistItemSchema).optional(),
});

export const createMaintenancePlanTemplate = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = templateSchema.parse(req.body);
  if (data.triggerType === "TIME" && !data.frequencyDays) {
    throw new ValidationError("Informe a periodicidade em dias para um modelo por tempo.");
  }
  if (data.triggerType === "METER" && !data.meterInterval) {
    throw new ValidationError("Informe o intervalo do medidor para um modelo por medidor.");
  }
  const clientId = req.user?.role === "CLIENT" ? resolveClientId(req, undefined) : (data.clientId ?? null);

  const { checklistItems, ...templateData } = data;
  const template = await prisma.maintenancePlanTemplate.create({
    data: {
      ...templateData,
      clientId,
      checklistItems: { create: (checklistItems ?? []).map((c, i) => ({ description: c.description, sortOrder: i })) },
    },
    include: { checklistItems: { orderBy: { sortOrder: "asc" } } },
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "CREATE",
    entityType: "MaintenancePlanTemplate",
    entityId: template.id,
    description: `Modelo de plano "${template.name}" criado`,
  });

  res.status(201).json(template);
});

const updateSchema = templateSchema.partial().extend({ active: z.boolean().optional() });

export const updateMaintenancePlanTemplate = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = updateSchema.parse(req.body);
  const existing = await prisma.maintenancePlanTemplate.findFirst({ where: { id: req.params.id } });
  if (!existing) throw new NotFoundError("Modelo de plano");

  if (req.user?.role === "CLIENT") {
    if (existing.clientId !== req.user.clientId) {
      throw new ForbiddenError("Este modelo faz parte do catalogo padrao e nao pode ser alterado.");
    }
    delete data.clientId;
  }

  const { checklistItems, ...templateData } = data;
  const template = await prisma.maintenancePlanTemplate.update({
    where: { id: existing.id },
    data: {
      ...templateData,
      ...(checklistItems
        ? { checklistItems: { deleteMany: {}, create: checklistItems.map((c, i) => ({ description: c.description, sortOrder: i })) } }
        : {}),
    },
    include: { checklistItems: { orderBy: { sortOrder: "asc" } } },
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "MaintenancePlanTemplate",
    entityId: template.id,
    description: `Modelo de plano "${template.name}" atualizado`,
  });

  res.json(template);
});

export const deleteMaintenancePlanTemplate = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const existing = await prisma.maintenancePlanTemplate.findFirst({ where: { id: req.params.id } });
  if (!existing) throw new NotFoundError("Modelo de plano");

  if (req.user?.role === "CLIENT" && existing.clientId !== req.user.clientId) {
    throw new ForbiddenError("Este modelo faz parte do catalogo padrao e nao pode ser removido.");
  }

  const inUse = await prisma.maintenancePlan.count({ where: { templateId: existing.id } });
  if (inUse > 0) throw new ValidationError("Este modelo ja foi aplicado a planos existentes. Desative-o em vez de remover.");

  await prisma.maintenancePlanTemplate.delete({ where: { id: existing.id } });
  res.status(204).send();
});

const applySchema = z.object({
  instrumentId: z.string().uuid(),
  meterId: z.string().uuid().nullish(),
  responsibleId: z.string().uuid().nullish(),
});

/** Instancia um plano de manutencao real a partir do modelo, para um ativo especifico -
 * copia periodicidade/tolerancia/procedimento/HH/checklist. O modelo continua reutilizavel
 * para outros ativos depois. */
export const applyMaintenancePlanTemplate = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const template = await prisma.maintenancePlanTemplate.findFirst({
    where: { id: req.params.id, ...scopeFilter(req) },
    include: { checklistItems: { orderBy: { sortOrder: "asc" } } },
  });
  if (!template) throw new NotFoundError("Modelo de plano");
  if (!template.active) throw new ValidationError("Modelo inativo nao pode ser aplicado.");

  const data = applySchema.parse(req.body);
  const instrument = await prisma.instrument.findFirst({ where: { id: data.instrumentId, deletedAt: null }, select: { clientId: true } });
  if (!instrument) throw new NotFoundError("Ativo");
  assertOwnClient(req, instrument.clientId);

  if (template.triggerType === "METER" && !data.meterId) {
    throw new ValidationError("Informe o medidor para aplicar um modelo por medidor.");
  }

  const nextDueDate = template.triggerType === "TIME" && template.frequencyDays ? computeNextDueDateFromDays(new Date(), template.frequencyDays) : null;

  const plan = await prisma.maintenancePlan.create({
    data: {
      clientId: instrument.clientId,
      instrumentId: data.instrumentId,
      templateId: template.id,
      name: template.name,
      triggerType: template.triggerType,
      frequencyDays: template.frequencyDays,
      meterId: data.meterId,
      meterInterval: template.meterInterval,
      toleranceDaysBefore: template.toleranceDaysBefore,
      toleranceDaysAfter: template.toleranceDaysAfter,
      procedure: template.procedure,
      estimatedLaborHours: template.estimatedLaborHours,
      responsibleId: data.responsibleId,
      nextDueDate,
      createdById: req.user?.sub,
      checklistTemplate: { create: template.checklistItems.map((c, i) => ({ description: c.description, sortOrder: i })) },
    },
    include: {
      client: { select: { id: true, companyName: true, tradeName: true } },
      instrument: { select: { id: true, type: true, model: true, serialNumber: true, tag: true } },
      meter: { select: { id: true, name: true, unit: true, currentValue: true } },
    },
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "CREATE",
    entityType: "MaintenancePlan",
    entityId: plan.id,
    description: `Plano de manutencao "${plan.name}" criado a partir do modelo "${template.name}"`,
  });

  res.status(201).json(plan);
});
