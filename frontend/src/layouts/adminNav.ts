import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Building2,
  ClipboardList,
  Gauge,
  BadgeCheck,
  FileWarning,
  FileSignature,
  Package,
  ShoppingCart,
  ReceiptText,
  Users,
  History,
  Wrench,
  Layers3,
} from "lucide-react";
import type { Role } from "../api/types";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
}

export const ADMIN_NAV: NavItem[] = [
  { to: "/gestao", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "TECHNICIAN", "COMMERCIAL"] },
  { to: "/gestao/clientes", label: "Clientes", icon: Building2, roles: ["ADMIN", "TECHNICIAN", "COMMERCIAL"] },
  { to: "/gestao/ordens-servico", label: "Ordens de servico", icon: ClipboardList, roles: ["ADMIN", "TECHNICIAN", "COMMERCIAL"] },
  { to: "/gestao/instrumentos", label: "Ativos", icon: Gauge, roles: ["ADMIN", "TECHNICIAN", "COMMERCIAL"] },
  { to: "/gestao/calibracoes", label: "Calibracoes", icon: BadgeCheck, roles: ["ADMIN", "TECHNICIAN", "COMMERCIAL"] },
  { to: "/gestao/laudos", label: "Laudos tecnicos", icon: FileWarning, roles: ["ADMIN", "TECHNICIAN", "COMMERCIAL"] },
  { to: "/gestao/contratos", label: "Contratos", icon: FileSignature, roles: ["ADMIN", "COMMERCIAL"] },
  { to: "/gestao/manutencao", label: "RLP Maintenance CMMS", icon: Wrench, roles: ["ADMIN", "TECHNICIAN", "COMMERCIAL"] },
  { to: "/gestao/produtos", label: "Produtos e estoque", icon: Package, roles: ["ADMIN", "COMMERCIAL"] },
  { to: "/gestao/orcamentos", label: "Orcamentos", icon: ReceiptText, roles: ["ADMIN", "COMMERCIAL"] },
  { to: "/gestao/pedidos", label: "Pedidos", icon: ShoppingCart, roles: ["ADMIN", "COMMERCIAL"] },
  { to: "/gestao/usuarios", label: "Usuarios e perfis", icon: Users, roles: ["ADMIN"] },
  { to: "/gestao/auditoria", label: "Auditoria", icon: History, roles: ["ADMIN"] },
  { to: "/gestao/plataforma", label: "Administracao da plataforma", icon: Layers3, roles: ["ADMIN"] },
];
