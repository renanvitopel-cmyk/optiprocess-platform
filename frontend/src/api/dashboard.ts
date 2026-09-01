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
