import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { NotFoundError, ForbiddenError, ValidationError } from "../../utils/errors";
import { writeAuditLog } from "../../utils/audit";
import { assertServiceAccess } from "../../middleware/rbac";
import { nextClientMaintenanceOrderNumber } from "../../utils/sequence";

/** Meter nao tem clientId proprio (pertence a um Instrument) - o escopo do cliente
 * e' aplicado via filtro na relacao instrument.clientId. */
function instrumentClientFilter(req: Request) {
  if (req.user?.role === "CLIENT") {
    return { instrument: { clientId: req.user.clientId ?? "" } };
  }
  return {};
}

export const listMeters = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const { instrumentId } = req.query as { instrumentId?: string };

  const meters = await prisma.meter.findMany({
    where: { deletedAt: null, ...instrumentClientFilter(req), ...(instrumentId ? { instrumentId } : {}) },
    orderBy: { createdAt: "asc" },
    include: { readings: { orderBy: { readAt: "desc" }, take: 5 } },
  });
  res.json(meters);
});

export const getMeter = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const meter = await prisma.meter.findFirst({
    where: { id: req.params.id, deletedAt: null, ...instrumentClientFilter(req) },
    include: { readings: { orderBy: { readAt: "desc" } } },
  });
  if (!meter) throw new NotFoundError("Medidor");
  res.json(meter);
});

const meterSchema = z.object({
  instrumentId: z.string().uuid(),
  name: z.string().min(1, "Informe o nome do medidor."),
  unit: z.string().min(1, "Informe a unidade (h, km, ciclos...)."),
  currentValue: z.coerce.number().nonnegative().optional(),
  // Faixa normal de operacao - fora dela, a leitura dispara manutencao preditiva.
  minThreshold: z.coerce.number().nullish(),
  maxThreshold: z.coerce.number().nullish(),
});

export const createMeter = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = meterSchema.parse(req.body);
  if (data.minThreshold != null && data.maxThreshold != null && data.minThreshold > data.maxThreshold) {
    throw new ValidationError("O limite minimo nao pode ser maior que o maximo.");
  }

  const instrument = await prisma.instrument.findFirst({ where: { id: data.instrumentId, deletedAt: null } });
  if (!instrument) throw new NotFoundError("Ativo");
  if (req.user?.role === "CLIENT" && instrument.clientId !== req.user.clientId) throw new ForbiddenError();

  const meter = await prisma.meter.create({ data: { ...data, createdById: req.user?.sub } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "CREATE",
    entityType: "Meter",
    entityId: meter.id,
    description: `Medidor ${meter.name} cadastrado`,
  });

  res.status(201).json(meter);
});

export const updateMeter = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = meterSchema.partial().parse(req.body);
  const existing = await prisma.meter.findFirst({ where: { id: req.params.id, deletedAt: null, ...instrumentClientFilter(req) } });
  if (!existing) throw new NotFoundError("Medidor");

  const minThreshold = data.minThreshold !== undefined ? data.minThreshold : existing.minThreshold;
  const maxThreshold = data.maxThreshold !== undefined ? data.maxThreshold : existing.maxThreshold;
  if (minThreshold != null && maxThreshold != null && minThreshold > maxThreshold) {
    throw new ValidationError("O limite minimo nao pode ser maior que o maximo.");
  }
  if (req.user?.role === "CLIENT") delete data.instrumentId; // cliente nao move o medidor para outro ativo

  const meter = await prisma.meter.update({ where: { id: existing.id }, data });
  res.json(meter);
});

export const deleteMeter = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.meter.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Medidor");

  await prisma.meter.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "DELETE",
    entityType: "Meter",
    entityId: existing.id,
    description: `Medidor ${existing.name} removido`,
  });

  res.status(204).send();
});

const readingSchema = z.object({
  value: z.coerce.number().nonnegative(),
  readAt: z.coerce.date().optional(),
});

/**
 * Registra a leitura e, se ela ultrapassar a faixa normal do medidor, dispara a
 * manutencao preditiva de verdade: marca a leitura e abre uma OS tipo PREDICTIVE
 * sozinha (sem precisar de ninguem escolher "Preditiva" num formulario). Nao duplica
 * se ja existir uma OS preditiva aberta para o mesmo medidor.
 */
export const addMeterReading = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = readingSchema.parse(req.body);
  const meter = await prisma.meter.findFirst({
    where: { id: req.params.id, deletedAt: null, ...instrumentClientFilter(req) },
    include: { instrument: { select: { id: true, clientId: true, tag: true, type: true, criticality: true } } },
  });
  if (!meter) throw new NotFoundError("Medidor");

  const alertTriggered =
    (meter.minThreshold != null && data.value < meter.minThreshold) ||
    (meter.maxThreshold != null && data.value > meter.maxThreshold);

  let triggeredWorkOrder = null;
  if (alertTriggered) {
    // "Ja aberta" = qualquer status que nao seja terminal - com o status da OS
    // expandido (Planejada/Programada/Aguardando...), so OPEN/IN_PROGRESS deixaria
    // passar uma duplicata enquanto a preditiva anterior esta em alguma dessas etapas.
    const alreadyOpen = await prisma.maintenanceWorkOrder.findFirst({
      where: { triggeredByMeterId: meter.id, deletedAt: null, status: { notIn: ["COMPLETED", "CANCELED"] } },
    });
    if (!alreadyOpen) {
      const number = await nextClientMaintenanceOrderNumber(meter.instrument.clientId);
      const direction = meter.maxThreshold != null && data.value > meter.maxThreshold ? "acima do maximo" : "abaixo do minimo";
      const limit = meter.maxThreshold != null && data.value > meter.maxThreshold ? meter.maxThreshold : meter.minThreshold;
      triggeredWorkOrder = await prisma.maintenanceWorkOrder.create({
        data: {
          number,
          clientId: meter.instrument.clientId,
          instrumentId: meter.instrument.id,
          type: "PREDICTIVE",
          // Prioridade da OS automatica segue a criticidade real do ativo - uma leitura
          // fora da faixa num ativo CRITICAL pesa muito mais que no mesmo alerta num LOW.
          priority: meter.instrument.criticality,
          status: "OPEN",
          description: `Leitura de "${meter.name}" (${data.value} ${meter.unit}) ficou ${direction} (${limit} ${meter.unit}). OS aberta automaticamente para inspecao.`,
          triggeredByMeterId: meter.id,
          createdById: req.user?.sub,
        },
      });
    }
  }

  const [reading] = await prisma.$transaction([
    prisma.meterReading.create({
      data: { meterId: meter.id, value: data.value, readAt: data.readAt ?? new Date(), recordedById: req.user?.sub, alertTriggered },
    }),
    prisma.meter.update({ where: { id: meter.id }, data: { currentValue: data.value } }),
  ]);

  if (triggeredWorkOrder) {
    await writeAuditLog({
      userId: req.user?.sub,
      action: "CREATE",
      entityType: "MaintenanceWorkOrder",
      entityId: triggeredWorkOrder.id,
      description: `OS ${triggeredWorkOrder.number} aberta automaticamente (leitura de "${meter.name}" fora da faixa)`,
    });
  }

  res.status(201).json({ ...reading, triggeredWorkOrder });
});
