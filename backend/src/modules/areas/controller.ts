import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { NotFoundError, ForbiddenError, ValidationError } from "../../utils/errors";
import { clientScopeFilter, assertServiceAccess } from "../../middleware/rbac";
import { writeAuditLog } from "../../utils/audit";

/** A tela sempre mostra a area com a planta e o centro de custo - toda resposta leva os
 * dois, para o que volta de um salvar ser igual ao que a lista mostra. */
const areaInclude = {
  plant: { select: { id: true, name: true } },
  costCenter: { select: { id: true, name: true, code: true } },
} as const;

export const listAreas = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const { clientId, plantId, active } = req.query as { clientId?: string; plantId?: string; active?: string };
  const areas = await prisma.area.findMany({
    where: {
      deletedAt: null,
      ...clientScopeFilter(req),
      ...(clientId ? { clientId } : {}),
      ...(plantId ? { plantId } : {}),
      ...(active !== undefined ? { active: active === "true" } : {}),
    },
    include: areaInclude,
    orderBy: { name: "asc" },
  });
  res.json(areas);
});

const areaSchema = z.object({
  clientId: z.string().uuid().optional(),
  plantId: z.string().uuid("Selecione a planta."),
  name: z.string().min(2, "Informe o nome da area."),
  code: z.string().nullish(),
  // Centro de custo padrao da area - todo ativo dentro dela herda este centro de custo.
  costCenterId: z.string().uuid().nullish(),
});

/** A planta escolhida precisa existir e ser da mesma empresa - senao a area ficaria
 * pendurada numa planta de outro cliente. */
async function assertPlantBelongsToClient(plantId: string, clientId: string): Promise<void> {
  const plant = await prisma.plant.findFirst({ where: { id: plantId, deletedAt: null } });
  if (!plant) throw new NotFoundError("Planta");
  if (plant.clientId !== clientId) throw new ValidationError("A planta selecionada e' de outra empresa.");
}

async function assertCostCenterBelongsToClient(costCenterId: string, clientId: string): Promise<void> {
  const costCenter = await prisma.costCenter.findFirst({ where: { id: costCenterId, deletedAt: null } });
  if (!costCenter) throw new NotFoundError("Centro de custo");
  if (costCenter.clientId !== clientId) throw new ValidationError("O centro de custo selecionado e' de outra empresa.");
}

export const createArea = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = areaSchema.parse(req.body);
  if (req.user?.role === "CLIENT") {
    if (!req.user.clientId) throw new ForbiddenError();
    data.clientId = req.user.clientId;
  } else if (!data.clientId) {
    throw new ValidationError("Selecione o cliente.");
  }
  await assertPlantBelongsToClient(data.plantId, data.clientId!);
  if (data.costCenterId) await assertCostCenterBelongsToClient(data.costCenterId, data.clientId!);

  const existing = await prisma.area.findFirst({
    where: { plantId: data.plantId, name: { equals: data.name, mode: "insensitive" } },
  });
  if (existing) {
    // Registro inativo OU removido volta a valer com o mesmo nome, JA COM OS DADOS QUE
    // acabaram de ser informados. Reviver mantendo os valores antigos era pior que o
    // impasse que isso resolveu: o usuario preenchia o formulario, salvava sem erro, e o
    // registro voltava como estava antes - o centro de custo escolhido simplesmente
    // desaparecia, sem nada na tela explicando.
    if (!existing.active || existing.deletedAt) {
      const reactivated = await prisma.area.update({
        where: { id: existing.id },
        data: { ...data, clientId: undefined, active: true, deletedAt: null },
        include: areaInclude,
      });
      return res.status(200).json(reactivated);
    }
    throw new ValidationError(`A area "${data.name}" ja existe nesta planta.`);
  }

  const area = await prisma.area.create({ data: { ...data, clientId: data.clientId! }, include: areaInclude });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "CREATE",
    entityType: "Area",
    entityId: area.id,
    description: `Area "${area.name}" cadastrada`,
  });

  return res.status(201).json(area);
});

const updateSchema = areaSchema.partial().extend({ active: z.boolean().optional() });

export const updateArea = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = updateSchema.parse(req.body);
  const existing = await prisma.area.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Area");
  if (req.user?.role === "CLIENT") {
    if (existing.clientId !== req.user.clientId) throw new ForbiddenError();
    delete data.clientId;
  }
  if (data.plantId) await assertPlantBelongsToClient(data.plantId, data.clientId ?? existing.clientId);

  const area = await prisma.area.update({ where: { id: existing.id }, data, include: areaInclude });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "Area",
    entityId: area.id,
    description: `Area "${area.name}" atualizada`,
  });

  res.json(area);
});

export const deleteArea = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.area.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Area");
  if (req.user?.role === "CLIENT" && existing.clientId !== req.user.clientId) throw new ForbiddenError();

  const activeSystems = await prisma.assetSystem.count({ where: { areaId: existing.id, deletedAt: null } });
  if (activeSystems > 0) throw new ValidationError("Esta area tem sistemas cadastrados - remova ou mova os sistemas primeiro.");

  await prisma.area.update({ where: { id: existing.id }, data: { deletedAt: new Date(), active: false } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "DELETE",
    entityType: "Area",
    entityId: existing.id,
    description: `Area "${existing.name}" removida`,
  });

  res.status(204).send();
});
