import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parsePageParams, toSkipTake, buildPagedResult } from "../../utils/pagination";
import { ForbiddenError, NotFoundError, ValidationError } from "../../utils/errors";
import { writeAuditLog } from "../../utils/audit";
import { clientScopeFilter, assertServiceAccess } from "../../middleware/rbac";
import { applySparePartMovement } from "../../lib/inventory";

export const listSpareParts = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const pageParams = parsePageParams(req.query as Record<string, unknown>);
  const { clientId, search, active } = req.query as { clientId?: string; search?: string; active?: string };

  const where = {
    deletedAt: null,
    ...clientScopeFilter(req),
    ...(clientId ? { clientId } : {}),
    ...(active !== undefined ? { active: active === "true" } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { code: { contains: search, mode: "insensitive" as const } },
            { category: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.sparePart.findMany({ where, orderBy: { name: "asc" }, ...toSkipTake(pageParams) }),
    prisma.sparePart.count({ where }),
  ]);

  res.json(buildPagedResult(items, total, pageParams));
});

export const getSparePart = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const sparePart = await prisma.sparePart.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    include: { movements: { orderBy: { createdAt: "desc" }, take: 20 } },
  });
  if (!sparePart) throw new NotFoundError("Peca do almoxarifado");
  res.json(sparePart);
});

const sparePartSchema = z.object({
  // Opcional aqui pelo mesmo motivo do Ativo: o portal do cliente nunca envia clientId
  // (o backend forca a propria empresa); obrigatorio so para a equipe interna.
  clientId: z.string().uuid().optional(),
  name: z.string().min(2, "Informe o nome da peca."),
  code: z.string().nullish(),
  category: z.string().nullish(),
  unit: z.string().min(1).optional(),
  minStock: z.coerce.number().int().nonnegative().optional(),
  // Custo unitario (opcional) - so alimenta valor de estoque e custo por ativo quando preenchido.
  unitCost: z.coerce.number().nonnegative().nullish(),
});

export const createSparePart = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = sparePartSchema.parse(req.body);

  if (req.user?.role === "CLIENT") {
    if (!req.user.clientId) throw new ForbiddenError();
    data.clientId = req.user.clientId;
  } else if (!data.clientId) {
    throw new ValidationError("Selecione o cliente.");
  }

  const sparePart = await prisma.sparePart.create({ data: { ...data, clientId: data.clientId!, createdById: req.user?.sub } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "CREATE",
    entityType: "SparePart",
    entityId: sparePart.id,
    description: `Peca do almoxarifado "${sparePart.name}" cadastrada`,
  });

  res.status(201).json(sparePart);
});

const updateSchema = sparePartSchema.partial().extend({ active: z.boolean().optional() });

export const updateSparePart = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const data = updateSchema.parse(req.body);
  const existing = await prisma.sparePart.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Peca do almoxarifado");

  if (req.user?.role === "CLIENT") {
    if (existing.clientId !== req.user.clientId) throw new ForbiddenError();
    delete data.clientId; // cliente nunca transfere a peca para outra empresa
  }

  const sparePart = await prisma.sparePart.update({ where: { id: existing.id }, data });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "SparePart",
    entityId: sparePart.id,
    description: `Peca do almoxarifado "${sparePart.name}" atualizada`,
  });

  res.json(sparePart);
});

export const deleteSparePart = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.sparePart.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Peca do almoxarifado");
  if (req.user?.role === "CLIENT" && existing.clientId !== req.user.clientId) throw new ForbiddenError();

  await prisma.sparePart.update({ where: { id: existing.id }, data: { deletedAt: new Date(), active: false } });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "DELETE",
    entityType: "SparePart",
    entityId: existing.id,
    description: `Peca do almoxarifado "${existing.name}" removida`,
  });

  res.status(204).send();
});

const movementSchema = z.object({
  type: z.enum(["IN", "OUT", "ADJUSTMENT"]),
  quantity: z.coerce.number().int().positive(),
  // Custo unitario desta compra/movimento (opcional) - preenche automaticamente o
  // unitCost da peca quando informado numa entrada (IN).
  unitCost: z.coerce.number().nonnegative().nullish(),
  reason: z.string().nullish(),
});

export const addSparePartMovement = asyncHandler(async (req: Request, res: Response) => {
  const data = movementSchema.parse(req.body);
  const existing = await prisma.sparePart.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Peca do almoxarifado");
  if (req.user?.role === "CLIENT" && existing.clientId !== req.user.clientId) throw new ForbiddenError();

  const movement = await applySparePartMovement({ ...data, sparePartId: req.params.id, createdById: req.user?.sub });

  await writeAuditLog({
    userId: req.user?.sub,
    action: "UPDATE",
    entityType: "SparePart",
    entityId: req.params.id,
    description: `Movimentacao de estoque (${data.type}) de ${data.quantity} un. no almoxarifado`,
  });

  res.status(201).json(movement);
});

/**
 * Alertas do almoxarifado - as tres situacoes que fazem uma preventiva parar na porta:
 *
 * 1. peca abaixo do estoque minimo;
 * 2. peca reservada para OS futura (o saldo existe, mas ja tem dono);
 * 3. OS programada ou atrasada com material obrigatorio faltando.
 *
 * Sao consultas diferentes que ninguem cruzava a mao - a falta so aparecia quando o
 * tecnico chegava no almoxarifado.
 */
export const getSparePartAlerts = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const { clientId } = req.query as { clientId?: string };
  const escopo = { deletedAt: null, ...clientScopeFilter(req), ...(clientId ? { clientId } : {}) };
  const agora = new Date();

  const pecas = await prisma.sparePart.findMany({
    where: { ...escopo, active: true },
    select: { id: true, name: true, code: true, unit: true, stockQty: true, reservedQty: true, minStock: true },
    orderBy: { name: "asc" },
  });

  const abaixoDoMinimo = pecas
    .filter((p) => p.stockQty <= p.minStock)
    .map((p) => ({ ...p, disponivel: p.stockQty - p.reservedQty, faltaParaOMinimo: Math.max(0, p.minStock - p.stockQty) }));

  const reservas = await prisma.sparePartReservation.findMany({
    where: {
      status: "RESERVED",
      sparePart: escopo,
      workOrder: { deletedAt: null, status: { notIn: ["COMPLETED", "CANCELED"] } },
    },
    select: {
      id: true,
      quantity: true,
      createdAt: true,
      sparePart: { select: { id: true, name: true, unit: true, stockQty: true, reservedQty: true } },
      workOrder: { select: { id: true, number: true, title: true, status: true, scheduledDate: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const reservadoParaOsFutura = reservas
    .filter((r) => r.workOrder.scheduledDate && r.workOrder.scheduledDate > agora)
    .map((r) => ({ reservationId: r.id, quantity: r.quantity, sparePart: r.sparePart, workOrder: r.workOrder }));

  const ordens = await prisma.maintenanceWorkOrder.findMany({
    where: {
      deletedAt: null,
      status: { notIn: ["COMPLETED", "CANCELED"] },
      ...clientScopeFilter(req),
      ...(clientId ? { clientId } : {}),
      materialLogs: { some: { required: true } },
    },
    select: {
      id: true,
      number: true,
      title: true,
      status: true,
      scheduledDate: true,
      materialLogs: {
        where: { required: true },
        select: {
          quantityNeeded: true,
          sparePartId: true,
          sparePart: { select: { id: true, name: true, unit: true, stockQty: true, reservedQty: true } },
        },
      },
      partReservations: { where: { status: "RESERVED" }, select: { sparePartId: true, quantity: true } },
      partsUsed: { select: { sparePartId: true, quantity: true } },
    },
  });

  const osComFalta = ordens
    .map((os) => {
      const reservado = new Map<string, number>();
      for (const r of os.partReservations) reservado.set(r.sparePartId, (reservado.get(r.sparePartId) ?? 0) + r.quantity);
      const consumido = new Map<string, number>();
      for (const m of os.partsUsed) consumido.set(m.sparePartId, (consumido.get(m.sparePartId) ?? 0) + m.quantity);

      const faltando = os.materialLogs
        .map((log) => {
          const cobertura = (reservado.get(log.sparePartId) ?? 0) + (consumido.get(log.sparePartId) ?? 0);
          const livre = log.sparePart.stockQty - log.sparePart.reservedQty;
          const falta = Math.max(0, log.quantityNeeded - cobertura - Math.max(0, livre));
          return { nome: log.sparePart.name, unidade: log.sparePart.unit, previsto: log.quantityNeeded, falta };
        })
        .filter((x) => x.falta > 0);

      return { id: os.id, number: os.number, title: os.title, status: os.status, scheduledDate: os.scheduledDate, faltando };
    })
    .filter((os) => os.faltando.length > 0)
    // Atrasada primeiro: e' a que ja deveria ter sido feita.
    .sort((a, b) => (a.scheduledDate?.getTime() ?? Infinity) - (b.scheduledDate?.getTime() ?? Infinity));

  res.json({
    abaixoDoMinimo,
    reservadoParaOsFutura,
    osComMaterialFaltando: osComFalta,
    totais: {
      abaixoDoMinimo: abaixoDoMinimo.length,
      reservasFuturas: reservadoParaOsFutura.length,
      osComFalta: osComFalta.length,
      // OS atrasada com material faltando e' a pior combinacao: ja passou da data e ainda
      // nao da para executar.
      osAtrasadasComFalta: osComFalta.filter((os) => os.scheduledDate && os.scheduledDate < agora).length,
    },
  });
});

/**
 * Historico completo de uma peca, num fio so: entrada, saida, ajuste, reserva, consumo e
 * devolucao - com data, usuario, OS relacionada e custo.
 *
 * Movimento e reserva vivem em tabelas separadas e a tela mostrava so os movimentos; quem
 * procurava "onde foram parar 4 rolamentos" nao via a reserva que os prendeu.
 */
export const getSparePartHistory = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const peca = await prisma.sparePart.findFirst({
    where: { id: req.params.id, deletedAt: null, ...clientScopeFilter(req) },
    select: { id: true, name: true, unit: true },
  });
  if (!peca) throw new NotFoundError("Peca do almoxarifado");

  const [movimentos, reservas, usuarios] = await Promise.all([
    prisma.sparePartMovement.findMany({
      where: { sparePartId: peca.id },
      select: {
        id: true,
        type: true,
        quantity: true,
        unitCost: true,
        reason: true,
        createdAt: true,
        createdById: true,
        maintenanceWorkOrder: { select: { id: true, number: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.sparePartReservation.findMany({
      where: { sparePartId: peca.id },
      select: {
        id: true,
        quantity: true,
        consumedQuantity: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
        createdById: true,
        workOrder: { select: { id: true, number: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.user.findMany({ where: { deletedAt: null }, select: { id: true, name: true } }),
  ]);

  const nomeDe = new Map(usuarios.map((u) => [u.id, u.name]));

  interface Evento {
    tipo: "ENTRADA" | "SAIDA" | "AJUSTE" | "RESERVA" | "CONSUMO" | "DEVOLUCAO";
    quantidade: number;
    quando: Date;
    usuario: string | null;
    workOrder: { id: string; number: string } | null;
    custoUnitario: number | null;
    observacao: string | null;
  }

  const eventos: Evento[] = [];

  for (const m of movimentos) {
    eventos.push({
      tipo: m.type === "IN" ? "ENTRADA" : m.type === "OUT" ? "SAIDA" : "AJUSTE",
      quantidade: m.quantity,
      quando: m.createdAt,
      usuario: m.createdById ? nomeDe.get(m.createdById) ?? null : null,
      workOrder: m.maintenanceWorkOrder,
      custoUnitario: m.unitCost,
      observacao: m.reason,
    });
  }

  for (const r of reservas) {
    const usuario = r.createdById ? nomeDe.get(r.createdById) ?? null : null;
    eventos.push({
      tipo: "RESERVA",
      quantidade: r.quantity,
      quando: r.createdAt,
      usuario,
      workOrder: r.workOrder,
      custoUnitario: null,
      observacao: `Reservado para a OS ${r.workOrder.number}`,
    });

    if (r.status === "CONSUMED" && r.resolvedAt) {
      const consumida = r.consumedQuantity ?? r.quantity;
      eventos.push({
        tipo: "CONSUMO",
        quantidade: consumida,
        quando: r.resolvedAt,
        usuario,
        workOrder: r.workOrder,
        custoUnitario: null,
        observacao: `Consumido na OS ${r.workOrder.number}`,
      });
      const devolvida = r.quantity - consumida;
      if (devolvida > 0) {
        eventos.push({
          tipo: "DEVOLUCAO",
          quantidade: devolvida,
          quando: r.resolvedAt,
          usuario,
          workOrder: r.workOrder,
          custoUnitario: null,
          observacao: "Sobra da reserva devolvida ao estoque",
        });
      }
    }

    if (r.status === "RELEASED" && r.resolvedAt) {
      eventos.push({
        tipo: "DEVOLUCAO",
        quantidade: r.quantity,
        quando: r.resolvedAt,
        usuario,
        workOrder: r.workOrder,
        custoUnitario: null,
        observacao: "Reserva liberada sem consumo",
      });
    }
  }

  eventos.sort((a, b) => b.quando.getTime() - a.quando.getTime());
  res.json({ sparePart: peca, eventos });
});
