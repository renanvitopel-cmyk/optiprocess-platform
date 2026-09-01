import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { ForbiddenError } from "../../utils/errors";

const IN_30_DAYS = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

export const getAdminDashboard = asyncHandler(async (_req: Request, res: Response) => {
  const now = new Date();
  const in30Days = IN_30_DAYS();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    activeClients,
    calibrationsDueSoon,
    openServiceOrders,
    reportsAwaitingApproval,
    recentOrders,
    lowStockProducts,
    upcomingServiceOrders,
    ordersForRevenue,
    serviceOrdersForChart,
  ] = await Promise.all([
    prisma.client.count({ where: { status: "ACTIVE", deletedAt: null } }),
    prisma.calibration.count({
      where: { deletedAt: null, status: "ISSUED", supersededBy: null, validUntil: { lte: in30Days, gte: now } },
    }),
    prisma.serviceOrder.count({
      where: { deletedAt: null, status: { in: ["BUDGET", "APPROVED", "SCHEDULED", "IN_PROGRESS"] } },
    }),
    prisma.technicalReport.count({ where: { deletedAt: null, status: "DRAFT" } }),
    prisma.order.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { client: { select: { companyName: true, tradeName: true } } },
    }),
    // Prisma nao compara duas colunas da mesma linha em "where"; com o catalogo
    // desta empresa (algumas centenas de SKUs), filtrar em memoria e suficiente.
    prisma.product
      .findMany({
        where: { deletedAt: null, status: "ACTIVE" },
        select: { id: true, name: true, sku: true, stockQty: true, minStock: true },
        orderBy: { stockQty: "asc" },
      })
      .then((products) => products.filter((p) => p.stockQty <= p.minStock).slice(0, 10)),
    prisma.serviceOrder.findMany({
      where: { deletedAt: null, scheduledDate: { gte: now }, status: { in: ["APPROVED", "SCHEDULED"] } },
      orderBy: { scheduledDate: "asc" },
      take: 10,
      include: { client: { select: { companyName: true, tradeName: true } }, technician: { select: { name: true } } },
    }),
    prisma.order.findMany({
      where: { deletedAt: null, createdAt: { gte: sixMonthsAgo }, status: { not: "CANCELED" } },
      select: { totalAmount: true, createdAt: true },
    }),
    prisma.serviceOrder.findMany({
      where: { deletedAt: null, createdAt: { gte: sixMonthsAgo } },
      select: { category: true, createdAt: true },
    }),
  ]);

  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    months.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }

  const revenueByMonth = Object.fromEntries(months.map((m) => [m, 0])) as Record<string, number>;
  for (const o of ordersForRevenue) {
    const key = monthKey(o.createdAt);
    if (key in revenueByMonth) revenueByMonth[key] += o.totalAmount;
  }

  const servicesByMonth = Object.fromEntries(months.map((m) => [m, 0])) as Record<string, number>;
  for (const so of serviceOrdersForChart) {
    const key = monthKey(so.createdAt);
    if (key in servicesByMonth) servicesByMonth[key] += 1;
  }

  res.json({
    kpis: {
      activeClients,
      calibrationsDueSoon,
      openServiceOrders,
      reportsAwaitingApproval,
    },
    recentOrders,
    lowStockProducts,
    upcomingServiceOrders,
    charts: {
      revenueByMonth: months.map((m) => ({ month: m, total: revenueByMonth[m] })),
      servicesByMonth: months.map((m) => ({ month: m, total: servicesByMonth[m] })),
    },
  });
});

export const getClientDashboard = asyncHandler(async (req: Request, res: Response) => {
  if (req.user?.role !== "CLIENT" || !req.user.clientId) throw new ForbiddenError();
  const clientId = req.user.clientId;
  const now = new Date();
  const in30Days = IN_30_DAYS();

  const [
    validCertificates,
    dueSoonCertificates,
    expiredCertificates,
    upcomingServiceOrders,
    recentReports,
    activeContracts,
    openQuotesAndOrders,
  ] = await Promise.all([
    prisma.calibration.count({
      where: { clientId, deletedAt: null, status: "ISSUED", visibleToClient: true, supersededBy: null, validUntil: { gt: in30Days } },
    }),
    prisma.calibration.count({
      where: {
        clientId,
        deletedAt: null,
        status: "ISSUED",
        visibleToClient: true,
        supersededBy: null,
        validUntil: { lte: in30Days, gte: now },
      },
    }),
    prisma.calibration.count({
      where: { clientId, deletedAt: null, status: "ISSUED", visibleToClient: true, supersededBy: null, validUntil: { lt: now } },
    }),
    prisma.serviceOrder.findMany({
      where: { clientId, deletedAt: null, scheduledDate: { gte: now } },
      orderBy: { scheduledDate: "asc" },
      take: 5,
    }),
    prisma.technicalReport.findMany({
      where: { clientId, deletedAt: null, status: "ISSUED", visibleToClient: true },
      orderBy: { reportDate: "desc" },
      take: 5,
    }),
    prisma.serviceContract.count({ where: { clientId, deletedAt: null, status: "ACTIVE" } }),
    prisma.quote.count({ where: { clientId, deletedAt: null, status: { in: ["NEW", "IN_ANALYSIS", "QUOTE_SENT"] } } }),
  ]);

  res.json({
    certificates: { valid: validCertificates, dueSoon: dueSoonCertificates, expired: expiredCertificates },
    upcomingServiceOrders,
    recentReports,
    activeContracts,
    openQuotesAndOrders,
  });
});
