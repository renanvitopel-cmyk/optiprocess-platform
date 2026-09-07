import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { NotFoundError, ForbiddenError, ValidationError } from "../../utils/errors";
import { assertServiceAccess, resolveClientScope } from "../../middleware/rbac";
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
      ...resolveClientScope(req, clientId),
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
  // O numero do centro de custo, digitado na propria linha da area. Area e centro de
  // custo viraram um cadastro so: exigir que o centro existisse antes, numa outra tela,
  // era um passo a mais para uma informacao que so existe por causa da area.
  costCenterCode: z.string().nullish(),
});

/**
 * Encontra o centro de custo pelo numero, ou cria na hora.
 *
 * undefined = o formulario nao mexeu no campo. "" = limpar. Um numero = usar esse centro,
 * reaproveitando o que ja existe (varias areas podem ratear no mesmo) e reativando um que
 * tenha sido desativado, em vez de criar um numero repetido.
 */
async function resolverCentroDeCusto(clientId: string, codigo: string | null | undefined): Promise<string | null | undefined> {
  if (codigo === undefined) return undefined;
  const numero = codigo?.trim();
  if (!numero) return null;

  const existente = await prisma.costCenter.findFirst({
    where: { clientId, deletedAt: null, OR: [{ code: numero }, { name: numero }] },
  });
  if (existente) {
    if (!existente.active) await prisma.costCenter.update({ where: { id: existente.id }, data: { active: true } });
    return existente.id;
  }

  // O nome recebe o proprio numero: e' o numero que identifica o centro em toda a tela,
  // e o banco exige nome unico por empresa - assim o unico nao vira o campo errado.
  const criado = await prisma.costCenter.create({ data: { clientId, code: numero, name: numero } });
  return criado.id;
}

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

  const { costCenterCode, ...campos } = data;
  const resolvido = await resolverCentroDeCusto(data.clientId!, costCenterCode);
  if (resolvido !== undefined) campos.costCenterId = resolvido;

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
        data: { ...campos, clientId: undefined, active: true, deletedAt: null },
        include: areaInclude,
      });
      return res.status(200).json(reactivated);
    }
    throw new ValidationError(`A area "${data.name}" ja existe nesta planta.`);
  }

  const area = await prisma.area.create({ data: { ...campos, clientId: data.clientId! }, include: areaInclude });

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

  const { costCenterCode, ...campos } = data;
  const resolvido = await resolverCentroDeCusto(existing.clientId, costCenterCode);
  if (resolvido !== undefined) campos.costCenterId = resolvido;

  const area = await prisma.area.update({ where: { id: existing.id }, data: campos, include: areaInclude });

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
