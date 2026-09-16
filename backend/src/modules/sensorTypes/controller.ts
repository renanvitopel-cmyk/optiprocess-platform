import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { NotFoundError, ValidationError } from "../../utils/errors";

/** Tecnologia do sensor dentro de uma grandeza (ex.: PT100, Termopar tipo K, dentro de
 * Temperatura) - usado no cadastro do ponto de calibracao para descrever corretamente o
 * principio de medicao no certificado. Cadastro interno da OptiProcess. */
export const listSensorTypes = asyncHandler(async (req: Request, res: Response) => {
  const { measurementTypeId, active } = req.query as { measurementTypeId?: string; active?: string };
  const types = await prisma.sensorType.findMany({
    where: {
      ...(measurementTypeId ? { measurementTypeId } : {}),
      ...(active !== undefined ? { active: active === "true" } : {}),
    },
    orderBy: { name: "asc" },
  });
  res.json(types);
});

const sensorTypeSchema = z.object({
  measurementTypeId: z.string().uuid("Selecione a grandeza."),
  name: z.string().min(1, "Informe o nome do tipo de sensor."),
});

export const createSensorType = asyncHandler(async (req: Request, res: Response) => {
  const data = sensorTypeSchema.parse(req.body);
  const measurementType = await prisma.measurementType.findFirst({ where: { id: data.measurementTypeId } });
  if (!measurementType) throw new NotFoundError("Grandeza");

  const existing = await prisma.sensorType.findFirst({
    where: { measurementTypeId: data.measurementTypeId, name: { equals: data.name, mode: "insensitive" } },
  });
  if (existing) throw new ValidationError(`O tipo de sensor "${data.name}" ja existe para esta grandeza.`);

  const type = await prisma.sensorType.create({ data });
  res.status(201).json(type);
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  active: z.boolean().optional(),
});

export const updateSensorType = asyncHandler(async (req: Request, res: Response) => {
  const data = updateSchema.parse(req.body);
  const existing = await prisma.sensorType.findFirst({ where: { id: req.params.id } });
  if (!existing) throw new NotFoundError("Tipo de sensor");

  const type = await prisma.sensorType.update({ where: { id: existing.id }, data });
  res.json(type);
});

export const deleteSensorType = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.sensorType.findFirst({ where: { id: req.params.id } });
  if (!existing) throw new NotFoundError("Tipo de sensor");

  const inUse = await prisma.instrumentCalibrationPoint.count({ where: { sensorTypeId: existing.id, deletedAt: null } });
  if (inUse > 0) throw new ValidationError("Este tipo de sensor ja esta em uso por algum ponto de calibracao. Desative-o em vez de remover.");

  await prisma.sensorType.delete({ where: { id: existing.id } });
  res.status(204).send();
});
