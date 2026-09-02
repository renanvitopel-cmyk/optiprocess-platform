import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { NotFoundError } from "../../utils/errors";

export const listFailureCodes = asyncHandler(async (req: Request, res: Response) => {
  const { active } = req.query as { active?: string };
  const codes = await prisma.failureCode.findMany({
    where: active !== undefined ? { active: active === "true" } : undefined,
    orderBy: { code: "asc" },
  });
  res.json(codes);
});

const failureCodeSchema = z.object({
  code: z.string().min(1, "Informe o codigo."),
  description: z.string().min(2, "Informe a descricao."),
  category: z.string().nullish(),
});

export const createFailureCode = asyncHandler(async (req: Request, res: Response) => {
  const data = failureCodeSchema.parse(req.body);
  const code = await prisma.failureCode.create({ data });
  res.status(201).json(code);
});

const updateSchema = failureCodeSchema.partial().extend({ active: z.boolean().optional() });

export const updateFailureCode = asyncHandler(async (req: Request, res: Response) => {
  const data = updateSchema.parse(req.body);
  const existing = await prisma.failureCode.findFirst({ where: { id: req.params.id } });
  if (!existing) throw new NotFoundError("Codigo de falha");

  const code = await prisma.failureCode.update({ where: { id: existing.id }, data });
  res.json(code);
});
