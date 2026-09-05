import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { NotFoundError, ForbiddenError, ValidationError } from "../../utils/errors";
import { clientScopeFilter, assertServiceAccess } from "../../middleware/rbac";
import { writeAuditLog } from "../../utils/audit";

export const listPlants = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const { clientId, active } = req.query as { clientId?: string; active?: string };
  const plants = await prisma.plant.findMany({
    where: {
      deletedAt: null,
      ...clientScopeFilter(req),
      ...(clientId ? { clientId } : {}),
      ...(active !== undefined ? { active: active === "true" } : {}),
    },
    orderBy: { name: "asc" },
  });
  res.json(plants);
});

const plantSchema = z.object({
  clientId: z.string().uuid().optional(),
  name: z.string().min(2, "Informe o nome da planta."),
  code: z.string().nullish(),
});

export const createPlant = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = plantSchema.parse(req.body);
  if (req.user?.role === "CLIENT") {
    if (!req.user.clientId) throw new ForbiddenError();
    data.clientId = req.user.clientId;
  } else if (!data.clientId) {
    throw new ValidationError("Selecione o cliente.");
  }

  const existing = await prisma.plant.findFirst({
    where: { clientId: data.clientId, name: { equals: data.name, mode: "insensitive" } },
  });
  if (existing) {
    // Registro inativo OU removido volta a valer com o mesmo nome, JA COM OS DADOS QUE
    // acabaram de ser informados. Reviver mantendo os valores antigos era pior que o
    // impasse que isso resolveu: o usuario preenchia o formulario, salvava sem erro, e o
    // registro voltava como estava antes - o centro de custo escolhido simplesmente
    // desaparecia, sem nada na tela explicando.
    if (!existing.active || existing.deletedAt) {
      const reactivated = await prisma.plant.update({
        where: { id: existing.id },
        data: { ...data, clientId: undefined, active: true, deletedAt: null },
      });
      return res.status(200).json(reactivated);
    }
    throw new ValidationError(`A planta "${data.name}" ja existe.`);
  }

  const plant = await prisma.plant.create({ data: { ...data, clientId: data.clientId! } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "CREATE",
    entityType: "Plant",
    entityId: plant.id,
    description: `Planta "${plant.name}" cadastrada`,
  });

  return res.status(201).json(plant);
});

const updateSchema = plantSchema.partial().extend({ active: z.boolean().optional() });

export const updatePlant = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = updateSchema.parse(req.body);
  const existing = await prisma.plant.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Planta");
  if (req.user?.role === "CLIENT") {
    if (existing.clientId !== req.user.clientId) throw new ForbiddenError();
    delete data.clientId;
  }

  const plant = await prisma.plant.update({ where: { id: existing.id }, data });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "Plant",
    entityId: plant.id,
    description: `Planta "${plant.name}" atualizada`,
  });

  res.json(plant);
});

export const deletePlant = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.plant.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Planta");
  if (req.user?.role === "CLIENT" && existing.clientId !== req.user.clientId) throw new ForbiddenError();

  const activeAreas = await prisma.area.count({ where: { plantId: existing.id, deletedAt: null } });
  if (activeAreas > 0) throw new ValidationError("Esta planta tem areas cadastradas - remova ou mova as areas primeiro.");

  await prisma.plant.update({ where: { id: existing.id }, data: { deletedAt: new Date(), active: false } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "DELETE",
    entityType: "Plant",
    entityId: existing.id,
    description: `Planta "${existing.name}" removida`,
  });

  res.status(204).send();
});
