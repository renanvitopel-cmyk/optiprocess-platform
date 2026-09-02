import type { Request, Response } from "express";
import { z } from "zod";
import { InstrumentStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parsePageParams, toSkipTake, buildPagedResult } from "../../utils/pagination";
import { NotFoundError } from "../../utils/errors";
import { writeAuditLog } from "../../utils/audit";
import { clientScopeFilter, assertServiceAccess } from "../../middleware/rbac";
import { deriveDueStatus, computeNextDueDate } from "../../utils/status";

function withDerivedStatus<T extends { status: InstrumentStatus; nextDueDate: Date | null }>(instrument: T) {
  const derived = instrument.status === "IN_MAINTENANCE" ? "IN_MAINTENANCE" : deriveDueStatus(instrument.nextDueDate);
  return { ...instrument, derivedStatus: derived };
}

export const listInstruments = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CALIBRATION"]);
  const pageParams = parsePageParams(req.query as Record<string, unknown>);
  const { clientId, search, status } = req.query as { clientId?: string; search?: string; status?: InstrumentStatus };

  const where = {
    deletedAt: null,
    ...clientScopeFilter(req),
    ...(clientId ? { clientId } : {}),
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { tag: { contains: search, mode: "insensitive" as const } },
            { model: { contains: search, mode: "insensitive" as const } },
            { serialNumber: { contains: search, mode: "insensitive" as const } },
            { manufacturer: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.instrument.findMany({
      where,
      orderBy: { nextDueDate: "asc" },
      ...toSkipTake(pageParams),
      include: { client: { select: { id: true, companyName: true, tradeName: true } } },
    }),
    prisma.instrument.count({ where }),
  ]);

  res.json(buildPagedResult(items.map(withDerivedStatus), total, pageParams));
});

export const getInstrument = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CALIBRATION"]);
  const instrument = await prisma.instrument.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    include: {
      client: { select: { id: true, companyName: true, tradeName: true } },
      calibrations: {
        where: { deletedAt: null },
        orderBy: { calibrationDate: "desc" },
        select: {
          id: true,
          certificateNumber: true,
          calibrationDate: true,
          validUntil: true,
          result: true,
          status: true,
          visibleToClient: true,
          revisionNumber: true,
        },
      },
    },
  });
  if (!instrument) throw new NotFoundError("Instrumento");
  res.json(withDerivedStatus(instrument));
});

const instrumentSchema = z.object({
  clientId: z.string().uuid(),
  type: z.string().min(2),
  tag: z.string().nullish(),
  manufacturer: z.string().min(1),
  model: z.string().min(1),
  serialNumber: z.string().min(1),
  measurementRange: z.string().nullish(),
  resolution: z.string().nullish(),
  unit: z.string().nullish(),
  installationLocation: z.string().nullish(),
  calibrationFrequencyMonths: z.coerce.number().int().min(1),
  lastCalibrationDate: z.coerce.date().nullish(),
  status: z.nativeEnum(InstrumentStatus).optional(),
});

export const createInstrument = asyncHandler(async (req: Request, res: Response) => {
  const data = instrumentSchema.parse(req.body);
  const nextDueDate = data.lastCalibrationDate
    ? computeNextDueDate(data.lastCalibrationDate, data.calibrationFrequencyMonths)
    : null;

  const instrument = await prisma.instrument.create({
    data: { ...data, nextDueDate, createdById: req.user?.sub },
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "CREATE",
    entityType: "Instrument",
    entityId: instrument.id,
    description: `Instrumento ${instrument.model} (${instrument.serialNumber}) cadastrado`,
  });

  res.status(201).json(instrument);
});

export const updateInstrument = asyncHandler(async (req: Request, res: Response) => {
  const data = instrumentSchema.partial().parse(req.body);
  const existing = await prisma.instrument.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Instrumento");

  const lastCalibrationDate = data.lastCalibrationDate ?? existing.lastCalibrationDate;
  const frequency = data.calibrationFrequencyMonths ?? existing.calibrationFrequencyMonths;
  const nextDueDate = lastCalibrationDate ? computeNextDueDate(lastCalibrationDate, frequency) : existing.nextDueDate;

  const instrument = await prisma.instrument.update({
    where: { id: req.params.id },
    data: { ...data, nextDueDate },
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "Instrument",
    entityId: instrument.id,
    description: `Instrumento ${instrument.model} (${instrument.serialNumber}) atualizado`,
  });

  res.json(instrument);
});

export const deleteInstrument = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.instrument.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Instrumento");

  await prisma.instrument.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "DELETE",
    entityType: "Instrument",
    entityId: existing.id,
    description: `Instrumento ${existing.model} (${existing.serialNumber}) removido`,
  });

  res.status(204).send();
});
