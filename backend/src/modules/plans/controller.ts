import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { writeAuditLog } from "../../utils/audit";

export const listPlans = asyncHandler(async (req: Request, res: Response) => {
  const { active } = req.query as { active?: string };
  const plans = await prisma.plan.findMany({
    where: active !== undefined ? { active: active === "true" } : undefined,
    orderBy: { name: "asc" },
    include: { _count: { select: { clients: true } } },
  });
  res.json(plans);
});

export const getPlan = asyncHandler(async (req: Request, res: Response) => {
  const plan = await prisma.plan.findUnique({ where: { id: req.params.id }, include: { _count: { select: { clients: true } } } });
  if (!plan) throw new NotFoundError("Plano");
  res.json(plan);
});

const planSchema = z.object({
  name: z.string().min(2, "Informe o nome do plano."),
  description: z.string().nullish(),
  priceMonthly: z.coerce.number().nonnegative().nullish(),
  maxUsers: z.coerce.number().int().positive().nullish(),
  maxInstruments: z.coerce.number().int().positive().nullish(),
  features: z.array(z.string().min(1)).optional(),
});

export const createPlan = asyncHandler(async (req: Request, res: Response) => {
  const data = planSchema.parse(req.body);
  const plan = await prisma.plan.create({ data });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "CREATE",
    entityType: "Plan",
    entityId: plan.id,
    description: `Plano "${plan.name}" criado`,
  });

  res.status(201).json(plan);
});

const updateSchema = planSchema.partial().extend({ active: z.boolean().optional() });

export const updatePlan = asyncHandler(async (req: Request, res: Response) => {
  const data = updateSchema.parse(req.body);
  const existing = await prisma.plan.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new NotFoundError("Plano");

  const plan = await prisma.plan.update({ where: { id: existing.id }, data });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "Plan",
    entityId: plan.id,
    description: `Plano "${plan.name}" atualizado`,
  });

  res.json(plan);
});

export const deletePlan = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.plan.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new NotFoundError("Plano");

  const inUse = await prisma.client.count({ where: { planId: existing.id, deletedAt: null } });
  if (inUse > 0) throw new ValidationError("Este plano esta atribuido a clientes. Desative-o em vez de remover, ou mude o plano desses clientes primeiro.");

  await prisma.plan.delete({ where: { id: existing.id } });
  res.status(204).send();
});
