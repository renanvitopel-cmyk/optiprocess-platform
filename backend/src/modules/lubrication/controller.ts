import type { Request, Response } from "express";
import { z } from "zod";
import { LubricantBase, LubricantType, LubricationCondition, LubricationMethod, MachineStateForLubrication } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { assertOwnClient, assertServiceAccess, clientScopeFilter, resolveClientId } from "../../middleware/rbac";
import { buildPagedResult, parsePageParams, toSkipTake } from "../../utils/pagination";
import { writeAuditLog } from "../../utils/audit";
import { applySparePartMovement } from "../../lib/inventory";

const UM_DIA = 24 * 60 * 60 * 1000;

function somaDias(data: Date, dias: number): Date {
  return new Date(data.getTime() + dias * UM_DIA);
}

// ---------------------------------------------------------------------------
// Lubrificantes (ficha tecnica sobre uma peca do almoxarifado)
// ---------------------------------------------------------------------------

const lubricantSchema = z.object({
  clientId: z.string().uuid().optional(),
  sparePartId: z.string().uuid(),
  type: z.nativeEnum(LubricantType).optional(),
  specification: z.string().nullish(),
  base: z.nativeEnum(LubricantBase).nullish(),
  manufacturer: z.string().nullish(),
  application: z.string().nullish(),
  notes: z.string().nullish(),
  active: z.boolean().optional(),
});

const lubricantInclude = {
  sparePart: { select: { id: true, name: true, code: true, unit: true, stockQty: true, minStock: true } },
} as const;

export const listLubricants = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const { clientId, active } = req.query as { clientId?: string; active?: string };
  const lubricants = await prisma.lubricant.findMany({
    where: {
      deletedAt: null,
      ...clientScopeFilter(req),
      ...(clientId ? { clientId } : {}),
      ...(active !== undefined ? { active: active === "true" } : {}),
    },
    include: lubricantInclude,
    orderBy: { sparePart: { name: "asc" } },
  });
  res.json(lubricants);
});

export const createLubricant = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = lubricantSchema.parse(req.body);
  const clientId = resolveClientId(req, data.clientId);

  const peca = await prisma.sparePart.findFirst({ where: { id: data.sparePartId, deletedAt: null }, select: { clientId: true, name: true } });
  if (!peca) throw new NotFoundError("Peca do almoxarifado");
  if (peca.clientId !== clientId) throw new ValidationError("Essa peca e' de outra empresa.");

  const jaExiste = await prisma.lubricant.findFirst({ where: { sparePartId: data.sparePartId, deletedAt: null } });
  if (jaExiste) throw new ValidationError(`"${peca.name}" ja esta cadastrado como lubrificante.`);

  const lubricant = await prisma.lubricant.create({
    data: { ...data, clientId, createdById: req.user?.sub },
    include: lubricantInclude,
  });
  await writeAuditLog({ userId: req.user?.sub, action: "CREATE", entityType: "Lubricant", entityId: lubricant.id, description: `Lubrificante ${peca.name} cadastrado` });
  res.status(201).json(lubricant);
});

export const updateLubricant = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = lubricantSchema.partial().parse(req.body);
  const existing = await prisma.lubricant.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Lubrificante");
  assertOwnClient(req, existing.clientId);

  // Trocar a peca vinculada mudaria o saldo e o historico de consumo de lugar - se o
  // lubrificante e' outro, o cadastro tambem e' outro.
  const { sparePartId, clientId, ...resto } = data;
  if (sparePartId && sparePartId !== existing.sparePartId) {
    throw new ValidationError("Nao da para trocar a peca de um lubrificante ja cadastrado. Cadastre outro lubrificante.");
  }

  const lubricant = await prisma.lubricant.update({ where: { id: existing.id }, data: resto, include: lubricantInclude });
  res.json(lubricant);
});

export const deleteLubricant = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const existing = await prisma.lubricant.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Lubrificante");
  assertOwnClient(req, existing.clientId);

  const emUso = await prisma.lubricationPoint.count({ where: { lubricantId: existing.id, deletedAt: null } });
  if (emUso > 0) throw new ValidationError(`Este lubrificante e' usado por ${emUso} ponto(s). Troque o lubrificante desses pontos antes de remover.`);

  await prisma.lubricant.update({ where: { id: existing.id }, data: { deletedAt: new Date(), active: false } });
  res.status(204).send();
});

// ---------------------------------------------------------------------------
// Pontos de lubrificacao
// ---------------------------------------------------------------------------

const pointSchema = z.object({
  clientId: z.string().uuid().optional(),
  instrumentId: z.string().uuid(),
  code: z.string().min(1, "Informe o codigo do ponto."),
  name: z.string().min(2, "Informe o nome do ponto."),
  component: z.string().nullish(),
  lubricantId: z.string().uuid(),
  quantityPerApplication: z.coerce.number().positive("A quantidade por aplicacao precisa ser maior que zero."),
  method: z.nativeEnum(LubricationMethod),
  frequencyDays: z.coerce.number().int().positive("A periodicidade precisa ser de pelo menos 1 dia."),
  machineState: z.nativeEnum(MachineStateForLubrication).optional(),
  accessNotes: z.string().nullish(),
  safetyNotes: z.string().nullish(),
  lastLubricatedAt: z.coerce.date().nullish(),
  active: z.boolean().optional(),
});

const pointInclude = {
  instrument: { select: { id: true, tag: true, description: true, type: true, area: { select: { id: true, name: true } }, plant: { select: { id: true, name: true } } } },
  lubricant: { include: lubricantInclude },
} as const;

/** Proxima aplicacao = ultima + periodicidade. Nunca lubrificado ainda: vence hoje, porque
 * um ponto cadastrado e nunca atendido e' justamente o que precisa aparecer na lista. */
function proximaAplicacao(ultima: Date | null | undefined, frequencyDays: number): Date {
  return ultima ? somaDias(ultima, frequencyDays) : new Date();
}

export const listLubricationPoints = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const pageParams = parsePageParams(req.query as Record<string, unknown>);
  const { clientId, instrumentId, lubricantId, routeId, situacao, search } = req.query as {
    clientId?: string; instrumentId?: string; lubricantId?: string; routeId?: string; situacao?: string; search?: string;
  };

  const hoje = new Date();
  const where = {
    deletedAt: null,
    active: true,
    ...clientScopeFilter(req),
    ...(clientId ? { clientId } : {}),
    ...(instrumentId ? { instrumentId } : {}),
    ...(lubricantId ? { lubricantId } : {}),
    ...(routeId ? { routeItems: { some: { routeId } } } : {}),
    ...(situacao === "vencidos" ? { nextDueAt: { lt: hoje } } : {}),
    ...(situacao === "proximos" ? { nextDueAt: { gte: hoje, lte: somaDias(hoje, 7) } } : {}),
    ...(search
      ? {
          OR: [
            { code: { contains: search, mode: "insensitive" as const } },
            { name: { contains: search, mode: "insensitive" as const } },
            { component: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.lubricationPoint.findMany({ where, include: pointInclude, orderBy: [{ nextDueAt: "asc" }, { code: "asc" }], ...toSkipTake(pageParams) }),
    prisma.lubricationPoint.count({ where }),
  ]);
  res.json(buildPagedResult(items, total, pageParams));
});

export const getLubricationPoint = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const point = await prisma.lubricationPoint.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    include: {
      ...pointInclude,
      routeItems: { include: { route: { select: { id: true, name: true } } } },
      records: {
        orderBy: { executedAt: "desc" },
        take: 50,
        include: {
          lubricant: { include: lubricantInclude },
          laborResource: { select: { id: true, name: true } },
          workOrder: { select: { id: true, number: true } },
        },
      },
    },
  });
  if (!point) throw new NotFoundError("Ponto de lubrificacao");
  res.json(point);
});

async function assertRefsDoPonto(clientId: string, data: { instrumentId?: string; lubricantId?: string }) {
  if (data.instrumentId) {
    const ativo = await prisma.instrument.findFirst({ where: { id: data.instrumentId, deletedAt: null }, select: { clientId: true } });
    if (!ativo) throw new NotFoundError("Ativo");
    if (ativo.clientId !== clientId) throw new ValidationError("Esse ativo e' de outra empresa.");
  }
  if (data.lubricantId) {
    const lub = await prisma.lubricant.findFirst({ where: { id: data.lubricantId, deletedAt: null }, select: { clientId: true } });
    if (!lub) throw new NotFoundError("Lubrificante");
    if (lub.clientId !== clientId) throw new ValidationError("Esse lubrificante e' de outra empresa.");
  }
}

export const createLubricationPoint = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = pointSchema.parse(req.body);
  const clientId = resolveClientId(req, data.clientId);
  await assertRefsDoPonto(clientId, data);

  const duplicado = await prisma.lubricationPoint.findFirst({ where: { clientId, code: data.code, deletedAt: null } });
  if (duplicado) throw new ValidationError(`Ja existe um ponto com o codigo "${data.code}".`);

  const point = await prisma.lubricationPoint.create({
    data: {
      ...data,
      clientId,
      nextDueAt: proximaAplicacao(data.lastLubricatedAt, data.frequencyDays),
      createdById: req.user?.sub,
    },
    include: pointInclude,
  });
  await writeAuditLog({ userId: req.user?.sub, action: "CREATE", entityType: "LubricationPoint", entityId: point.id, description: `Ponto de lubrificacao ${point.code} cadastrado` });
  res.status(201).json(point);
});

export const updateLubricationPoint = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = pointSchema.partial().parse(req.body);
  const existing = await prisma.lubricationPoint.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Ponto de lubrificacao");
  assertOwnClient(req, existing.clientId);
  await assertRefsDoPonto(existing.clientId, data);

  const { clientId: _ignorado, ...resto } = data;
  const frequencyDays = resto.frequencyDays ?? existing.frequencyDays;
  const lastLubricatedAt = resto.lastLubricatedAt !== undefined ? resto.lastLubricatedAt : existing.lastLubricatedAt;

  const point = await prisma.lubricationPoint.update({
    where: { id: existing.id },
    data: { ...resto, nextDueAt: proximaAplicacao(lastLubricatedAt, frequencyDays) },
    include: pointInclude,
  });
  res.json(point);
});

export const deleteLubricationPoint = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const existing = await prisma.lubricationPoint.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Ponto de lubrificacao");
  assertOwnClient(req, existing.clientId);
  await prisma.lubricationPoint.update({ where: { id: existing.id }, data: { deletedAt: new Date(), active: false } });
  res.status(204).send();
});

// ---------------------------------------------------------------------------
// Registro de aplicacao (o que fecha o ciclo: baixa o estoque e reprograma o ponto)
// ---------------------------------------------------------------------------

const recordSchema = z.object({
  quantity: z.coerce.number().positive("Informe a quantidade aplicada."),
  // Pode ser outro que o especificado (faltou o certo) - por isso e' informavel.
  lubricantId: z.string().uuid().optional(),
  executedAt: z.coerce.date().optional(),
  laborResourceId: z.string().uuid().nullish(),
  workOrderId: z.string().uuid().nullish(),
  conditionBefore: z.nativeEnum(LubricationCondition).nullish(),
  conditionAfter: z.nativeEnum(LubricationCondition).nullish(),
  notes: z.string().nullish(),
});

export const createLubricationRecord = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = recordSchema.parse(req.body);
  const point = await prisma.lubricationPoint.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: { lubricant: { include: { sparePart: { select: { id: true, name: true, stockQty: true, unit: true } } } } },
  });
  if (!point) throw new NotFoundError("Ponto de lubrificacao");
  assertOwnClient(req, point.clientId);

  const lubricantId = data.lubricantId ?? point.lubricantId;
  const lubricante =
    lubricantId === point.lubricantId
      ? point.lubricant
      : await prisma.lubricant.findFirst({ where: { id: lubricantId, deletedAt: null }, include: { sparePart: { select: { id: true, name: true, stockQty: true, unit: true } } } });
  if (!lubricante) throw new NotFoundError("Lubrificante");
  if (lubricante.clientId !== point.clientId) throw new ValidationError("Esse lubrificante e' de outra empresa.");

  const executedAt = data.executedAt ?? new Date();

  // Aplicar e consumir sao o mesmo evento: a baixa no almoxarifado sai junto do registro,
  // e nao num lancamento manual que alguem teria que lembrar de fazer depois.
  const movement = await applySparePartMovement({
    sparePartId: lubricante.sparePartId,
    type: "OUT",
    quantity: data.quantity,
    reason: `Lubrificacao do ponto ${point.code} (${point.name})`,
    maintenanceWorkOrderId: data.workOrderId ?? null,
    createdById: req.user?.sub,
  });

  const record = await prisma.lubricationRecord.create({
    data: {
      clientId: point.clientId,
      pointId: point.id,
      lubricantId,
      workOrderId: data.workOrderId ?? null,
      quantity: data.quantity,
      executedAt,
      laborResourceId: data.laborResourceId ?? null,
      conditionBefore: data.conditionBefore ?? null,
      conditionAfter: data.conditionAfter ?? null,
      notes: data.notes ?? null,
      movementId: movement.id,
      createdById: req.user?.sub,
    },
    include: { lubricant: { include: lubricantInclude }, laborResource: { select: { id: true, name: true } } },
  });

  // Aplicou: o ponto reprograma a partir desta data.
  await prisma.lubricationPoint.update({
    where: { id: point.id },
    data: { lastLubricatedAt: executedAt, nextDueAt: somaDias(executedAt, point.frequencyDays) },
  });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "CREATE",
    entityType: "LubricationRecord",
    entityId: record.id,
    description: `Lubrificacao do ponto ${point.code}: ${data.quantity} ${lubricante.sparePart.unit}`,
  });

  res.status(201).json(record);
});

export const listLubricationRecords = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const pageParams = parsePageParams(req.query as Record<string, unknown>);
  const { clientId, pointId, lubricantId, dateFrom, dateTo } = req.query as {
    clientId?: string; pointId?: string; lubricantId?: string; dateFrom?: string; dateTo?: string;
  };

  const where = {
    ...clientScopeFilter(req),
    ...(clientId ? { clientId } : {}),
    ...(pointId ? { pointId } : {}),
    ...(lubricantId ? { lubricantId } : {}),
    ...(dateFrom || dateTo
      ? { executedAt: { ...(dateFrom ? { gte: new Date(dateFrom) } : {}), ...(dateTo ? { lte: new Date(dateTo) } : {}) } }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.lubricationRecord.findMany({
      where,
      orderBy: { executedAt: "desc" },
      ...toSkipTake(pageParams),
      include: {
        point: { select: { id: true, code: true, name: true, instrument: { select: { id: true, tag: true } } } },
        lubricant: { include: lubricantInclude },
        laborResource: { select: { id: true, name: true } },
        workOrder: { select: { id: true, number: true } },
      },
    }),
    prisma.lubricationRecord.count({ where }),
  ]);
  res.json(buildPagedResult(items, total, pageParams));
});

// ---------------------------------------------------------------------------
// Rotas
// ---------------------------------------------------------------------------

const routeSchema = z.object({
  clientId: z.string().uuid().optional(),
  name: z.string().min(2, "Informe o nome da rota."),
  code: z.string().nullish(),
  plantId: z.string().uuid().nullish(),
  areaId: z.string().uuid().nullish(),
  responsibleId: z.string().uuid().nullish(),
  notes: z.string().nullish(),
  active: z.boolean().optional(),
  pointIds: z.array(z.string().uuid()).optional(),
});

const routeInclude = {
  plant: { select: { id: true, name: true } },
  area: { select: { id: true, name: true } },
  responsible: { select: { id: true, name: true, type: true } },
  items: {
    orderBy: { sortOrder: "asc" as const },
    include: { point: { include: pointInclude } },
  },
} as const;

export const listLubricationRoutes = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const { clientId, active } = req.query as { clientId?: string; active?: string };
  const routes = await prisma.lubricationRoute.findMany({
    where: {
      deletedAt: null,
      ...clientScopeFilter(req),
      ...(clientId ? { clientId } : {}),
      ...(active !== undefined ? { active: active === "true" } : {}),
    },
    include: routeInclude,
    orderBy: { name: "asc" },
  });
  res.json(routes);
});

export const getLubricationRoute = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const route = await prisma.lubricationRoute.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    include: routeInclude,
  });
  if (!route) throw new NotFoundError("Rota de lubrificacao");
  res.json(route);
});

/** Os pontos da rota tem que ser da mesma empresa - senao a rota levaria o lubrificador a
 * um equipamento de outro cliente. */
async function assertPontosDoCliente(clientId: string, pointIds: string[]) {
  if (pointIds.length === 0) return;
  const encontrados = await prisma.lubricationPoint.findMany({ where: { id: { in: pointIds }, deletedAt: null }, select: { id: true, clientId: true } });
  if (encontrados.length !== pointIds.length) throw new NotFoundError("Ponto de lubrificacao");
  if (encontrados.some((p) => p.clientId !== clientId)) throw new ValidationError("Ha ponto de outra empresa na rota.");
}

export const createLubricationRoute = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const { pointIds = [], ...data } = routeSchema.parse(req.body);
  const clientId = resolveClientId(req, data.clientId);
  await assertPontosDoCliente(clientId, pointIds);

  const route = await prisma.lubricationRoute.create({
    data: {
      ...data,
      clientId,
      createdById: req.user?.sub,
      items: { create: pointIds.map((pointId, i) => ({ pointId, sortOrder: i })) },
    },
    include: routeInclude,
  });
  await writeAuditLog({ userId: req.user?.sub, action: "CREATE", entityType: "LubricationRoute", entityId: route.id, description: `Rota de lubrificacao ${route.name} criada` });
  res.status(201).json(route);
});

export const updateLubricationRoute = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const { pointIds, clientId: _ignorado, ...data } = routeSchema.partial().parse(req.body);
  const existing = await prisma.lubricationRoute.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Rota de lubrificacao");
  assertOwnClient(req, existing.clientId);

  if (pointIds) {
    await assertPontosDoCliente(existing.clientId, pointIds);
    await prisma.lubricationRouteItem.deleteMany({ where: { routeId: existing.id } });
  }

  const route = await prisma.lubricationRoute.update({
    where: { id: existing.id },
    data: {
      ...data,
      ...(pointIds ? { items: { create: pointIds.map((pointId, i) => ({ pointId, sortOrder: i })) } } : {}),
    },
    include: routeInclude,
  });
  res.json(route);
});

export const deleteLubricationRoute = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const existing = await prisma.lubricationRoute.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Rota de lubrificacao");
  assertOwnClient(req, existing.clientId);
  await prisma.lubricationRoute.update({ where: { id: existing.id }, data: { deletedAt: new Date(), active: false } });
  res.status(204).send();
});

// ---------------------------------------------------------------------------
// Previsao de consumo
// ---------------------------------------------------------------------------

/** Quantas aplicacoes um ponto tem dentro da janela pedida.
 *
 * Conta os vencimentos de verdade (a partir do proximo, somando a periodicidade), em vez
 * de dividir o periodo pela frequencia: um ponto que vence daqui a 25 dias nao consome
 * nada num periodo de 20 dias, e a divisao simples diria que consome. */
function aplicacoesNoPeriodo(nextDueAt: Date | null, frequencyDays: number, de: Date, ate: Date): number {
  if (frequencyDays <= 0) return 0;
  let vencimento = nextDueAt ?? de;
  // Ponto ja vencido antes da janela: a aplicacao atrasada e' feita dentro dela.
  if (vencimento < de) vencimento = de;

  let n = 0;
  // Teto defensivo: janelas absurdas com periodicidade diaria nao podem virar loop infinito.
  while (vencimento <= ate && n < 10000) {
    n += 1;
    vencimento = somaDias(vencimento, frequencyDays);
  }
  return n;
}

export const getLubricationForecast = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const { clientId, dateFrom, dateTo } = req.query as { clientId?: string; dateFrom?: string; dateTo?: string };

  const de = dateFrom ? new Date(dateFrom) : new Date();
  const ate = dateTo ? new Date(dateTo) : somaDias(de, 90);
  if (ate < de) throw new ValidationError("A data final da previsao nao pode ser antes da inicial.");

  const pontos = await prisma.lubricationPoint.findMany({
    where: { deletedAt: null, active: true, ...clientScopeFilter(req), ...(clientId ? { clientId } : {}) },
    include: {
      lubricant: { include: lubricantInclude },
      instrument: { select: { id: true, tag: true, area: { select: { id: true, name: true } } } },
    },
  });

  type Linha = {
    lubricantId: string;
    nome: string;
    codigo: string | null;
    unidade: string;
    especificacao: string | null;
    consumoPrevisto: number;
    aplicacoes: number;
    pontos: number;
    saldoAtual: number;
    estoqueMinimo: number;
    // Quanto falta comprar para atender o periodo sem furar o minimo.
    aComprar: number;
    // Em quantos dias o saldo acaba no ritmo previsto - null quando nao ha consumo previsto.
    diasDeCobertura: number | null;
  };

  const porLubrificante = new Map<string, Linha>();
  const detalhePorPonto: {
    pointId: string; code: string; name: string; instrumentTag: string | null; area: string | null;
    lubricante: string; aplicacoes: number; consumoPrevisto: number; unidade: string;
  }[] = [];

  for (const ponto of pontos) {
    const aplicacoes = aplicacoesNoPeriodo(ponto.nextDueAt, ponto.frequencyDays, de, ate);
    const consumo = aplicacoes * ponto.quantityPerApplication;
    const lub = ponto.lubricant;

    detalhePorPonto.push({
      pointId: ponto.id,
      code: ponto.code,
      name: ponto.name,
      instrumentTag: ponto.instrument?.tag ?? null,
      area: ponto.instrument?.area?.name ?? null,
      lubricante: lub.sparePart.name,
      aplicacoes,
      consumoPrevisto: consumo,
      unidade: lub.sparePart.unit,
    });

    const atual = porLubrificante.get(lub.id);
    if (atual) {
      atual.consumoPrevisto += consumo;
      atual.aplicacoes += aplicacoes;
      atual.pontos += 1;
    } else {
      porLubrificante.set(lub.id, {
        lubricantId: lub.id,
        nome: lub.sparePart.name,
        codigo: lub.sparePart.code,
        unidade: lub.sparePart.unit,
        especificacao: lub.specification,
        consumoPrevisto: consumo,
        aplicacoes,
        pontos: 1,
        saldoAtual: lub.sparePart.stockQty,
        estoqueMinimo: lub.sparePart.minStock,
        aComprar: 0,
        diasDeCobertura: null,
      });
    }
  }

  const diasDaJanela = Math.max(1, Math.round((ate.getTime() - de.getTime()) / UM_DIA));
  const itens = [...porLubrificante.values()].map((linha) => {
    const faltando = linha.consumoPrevisto + linha.estoqueMinimo - linha.saldoAtual;
    const consumoDiario = linha.consumoPrevisto / diasDaJanela;
    return {
      ...linha,
      aComprar: faltando > 0 ? Number(faltando.toFixed(3)) : 0,
      consumoPrevisto: Number(linha.consumoPrevisto.toFixed(3)),
      diasDeCobertura: consumoDiario > 0 ? Math.floor(linha.saldoAtual / consumoDiario) : null,
    };
  });
  itens.sort((a, b) => b.consumoPrevisto - a.consumoPrevisto);

  res.json({
    periodo: { de, ate, dias: diasDaJanela },
    itens,
    detalhePorPonto: detalhePorPonto.sort((a, b) => b.consumoPrevisto - a.consumoPrevisto),
    totais: {
      pontosConsiderados: pontos.length,
      lubrificantes: itens.length,
      aplicacoesPrevistas: itens.reduce((s, i) => s + i.aplicacoes, 0),
      itensAComprar: itens.filter((i) => i.aComprar > 0).length,
    },
  });
});

export const getLubricationDashboard = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const { clientId } = req.query as { clientId?: string };
  const hoje = new Date();
  const escopo = { deletedAt: null, active: true, ...clientScopeFilter(req), ...(clientId ? { clientId } : {}) };

  const [total, vencidos, proximos, rotas, ultimos30] = await Promise.all([
    prisma.lubricationPoint.count({ where: escopo }),
    prisma.lubricationPoint.count({ where: { ...escopo, nextDueAt: { lt: hoje } } }),
    prisma.lubricationPoint.count({ where: { ...escopo, nextDueAt: { gte: hoje, lte: somaDias(hoje, 7) } } }),
    prisma.lubricationRoute.count({ where: { deletedAt: null, active: true, ...clientScopeFilter(req), ...(clientId ? { clientId } : {}) } }),
    prisma.lubricationRecord.count({
      where: { ...clientScopeFilter(req), ...(clientId ? { clientId } : {}), executedAt: { gte: somaDias(hoje, -30) } },
    }),
  ]);

  // Pontos vencidos ha mais tempo primeiro: e' por onde o lubrificador comeca o dia.
  const atrasados = await prisma.lubricationPoint.findMany({
    where: { ...escopo, nextDueAt: { lt: hoje } },
    include: pointInclude,
    orderBy: { nextDueAt: "asc" },
    take: 20,
  });

  res.json({
    totais: { pontos: total, vencidos, proximos7Dias: proximos, rotas, aplicacoes30Dias: ultimos30 },
    // Aderencia so faz sentido com pontos cadastrados; sem eles, null (e nao 100%).
    aderenciaPct: total > 0 ? Number((((total - vencidos) / total) * 100).toFixed(1)) : null,
    atrasados,
  });
});
