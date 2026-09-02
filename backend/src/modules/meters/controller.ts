import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { NotFoundError } from "../../utils/errors";
import { writeAuditLog } from "../../utils/audit";
import { assertServiceAccess } from "../../middleware/rbac";

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
});

export const createMeter = asyncHandler(async (req: Request, res: Response) => {
  const data = meterSchema.parse(req.body);
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
  const data = meterSchema.partial().parse(req.body);
  const existing = await prisma.meter.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Medidor");

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

export const addMeterReading = asyncHandler(async (req: Request, res: Response) => {
  const data = readingSchema.parse(req.body);
  const meter = await prisma.meter.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!meter) throw new NotFoundError("Medidor");

  const [reading] = await prisma.$transaction([
    prisma.meterReading.create({
      data: { meterId: meter.id, value: data.value, readAt: data.readAt ?? new Date(), recordedById: req.user?.sub },
    }),
    prisma.meter.update({ where: { id: meter.id }, data: { currentValue: data.value } }),
  ]);

  res.status(201).json(reading);
});
