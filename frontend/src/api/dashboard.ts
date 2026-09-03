import { api } from "./client";
import type { Order, ServiceOrder, TechnicalReport } from "./types";

export interface AdminDashboard {
  kpis: {
    activeClients: number;
    calibrationsDueSoon: number;
    openServiceOrders: number;
    reportsAwaitingApproval: number;
  };
  recentOrders: Order[];
  lowStockProducts: { id: string; name: string; sku: string; stockQty: number; minStock: number }[];
  upcomingServiceOrders: ServiceOrder[];
  charts: {
    revenueByMonth: { month: string; total: number }[];
    servicesByMonth: { month: string; total: number }[];
  };
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const { data } = await api.get<AdminDashboard>("/dashboard/admin");
  return data;
}

export interface ClientDashboard {
  certificates: { valid: number; dueSoon: number; expired: number };
  upcomingServiceOrders: ServiceOrder[];
  recentReports: TechnicalReport[];
  activeContracts: number;
  openQuotesAndOrders: number;
}

export async function getClientDashboard(): Promise<ClientDashboard> {
  const { data } = await api.get<ClientDashboard>("/dashboard/client");
  return data;
}

export interface PlatformDashboard {
  totalActiveClients: number;
  clientsWithoutPlan: number;
  mrr: number;
  plans: { id: string; name: string; active: boolean; priceMonthly: number | null; clientCount: number }[];
  nearLimitClients: {
    clientId: string;
    name: string;
    planName: string;
    users: { current: number; limit: number | null; pct: number | null };
    instruments: { current: number; limit: number | null; pct: number | null };
    worstPct: number;
  }[];
}

export async function getPlatformDashboard(): Promise<PlatformDashboard> {
  const { data } = await api.get<PlatformDashboard>("/dashboard/platform");
  return data;
}
