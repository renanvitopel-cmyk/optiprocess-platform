import type { Request, Response } from "express";
import { z } from "zod";
import { MeasurementFieldProfile } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { NotFoundError, ValidationError } from "../../utils/errors";

/** Catalogo das grandezas calibradas (Temperatura, Balanca/Peso...) - decide a unidade
 * padrao e quais campos extras o formulario do ponto de calibracao mostra. Cadastro
 * interno da OptiProcess, sem escopo por cliente. */
export const listMeasurementTypes = asyncHandler(async (req: Request, res: Response) => {
  const { active } = req.query as { active?: string };
  const types = await prisma.measurementType.findMany({
    where: active !== undefined ? { active: active === "true" } : {},
    orderBy: { name: "asc" },
  });
  res.json(types);
});

const measurementTypeSchema = z.object({
  name: z.string().min(2, "Informe o nome da grandeza."),
  defaultUnit: z.string().nullish(),
  fieldProfile: z.nativeEnum(MeasurementFieldProfile).optional(),
});

export const createMeasurementType = asyncHandler(async (req: Request, res: Response) => {
  const data = measurementTypeSchema.parse(req.body);
  const existing = await prisma.measurementType.findFirst({ where: { name: { equals: data.name, mode: "insensitive" } } });
  if (existing) throw new ValidationError(`A grandeza "${data.name}" ja existe.`);

  const type = await prisma.measurementType.create({ data });
  res.status(201).json(type);
});

const updateSchema = measurementTypeSchema.partial().extend({ active: z.boolean().optional() });

export const updateMeasurementType = asyncHandler(async (req: Request, res: Response) => {
  const data = updateSchema.parse(req.body);
  const existing = await prisma.measurementType.findFirst({ where: { id: req.params.id } });
  if (!existing) throw new NotFoundError("Tipo de grandeza");

  const type = await prisma.measurementType.update({ where: { id: existing.id }, data });
  res.json(type);
});

export const deleteMeasurementType = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.measurementType.findFirst({ where: { id: req.params.id } });
  if (!existing) throw new NotFoundError("Tipo de grandeza");

  const inUse = await prisma.instrumentCalibrationPoint.count({ where: { measurementTypeId: existing.id, deletedAt: null } });
  if (inUse > 0) throw new ValidationError("Esta grandeza ja esta em uso por algum ponto de calibracao. Desative-a em vez de remover.");

  await prisma.measurementType.delete({ where: { id: existing.id } });
  res.status(204).send();
});
