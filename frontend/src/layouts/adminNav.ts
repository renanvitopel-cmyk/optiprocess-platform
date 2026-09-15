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
  Layers3,
  Ruler,
} from "lucide-react";
import type { Role } from "../api/types";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
}

export interface NavGroup {
  /** Sem label = grupo "solto" no topo, sem cabecalho visual (ex.: Dashboard sozinho). */
  label?: string;
  items: NavItem[];
}

/** Menu lateral agrupado por area de atuacao - Ativos/Calibracoes/Padroes de referencia
 * sao a mesma esteira de trabalho (calibracao), Produtos/Orcamentos/Pedidos sao a esteira
 * de vendas. Agrupar deixa isso visualmente claro em vez de uma lista plana de 14 itens. */
export const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    items: [{ to: "/gestao", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "TECHNICIAN", "COMMERCIAL"] }],
  },
  {
    items: [
      { to: "/gestao/clientes", label: "Clientes", icon: Building2, roles: ["ADMIN", "TECHNICIAN", "COMMERCIAL"] },
      { to: "/gestao/ordens-servico", label: "Ordens de servico", icon: ClipboardList, roles: ["ADMIN", "TECHNICIAN", "COMMERCIAL"] },
      { to: "/gestao/contratos", label: "Contratos", icon: FileSignature, roles: ["ADMIN", "COMMERCIAL"] },
    ],
  },
  {
    label: "Calibracao",
    items: [
      { to: "/gestao/instrumentos", label: "Ativos", icon: Gauge, roles: ["ADMIN", "TECHNICIAN", "COMMERCIAL"] },
      { to: "/gestao/calibracoes", label: "Calibracoes", icon: BadgeCheck, roles: ["ADMIN", "TECHNICIAN", "COMMERCIAL"] },
      { to: "/gestao/padroes-referencia", label: "Padroes de referencia", icon: Ruler, roles: ["ADMIN", "TECHNICIAN", "COMMERCIAL"] },
      { to: "/gestao/laudos", label: "Laudos tecnicos", icon: FileWarning, roles: ["ADMIN", "TECHNICIAN", "COMMERCIAL"] },
    ],
  },
  {
    label: "Vendas",
    items: [
      { to: "/gestao/produtos", label: "Produtos e estoque", icon: Package, roles: ["ADMIN", "COMMERCIAL"] },
      { to: "/gestao/orcamentos", label: "Orcamentos", icon: ReceiptText, roles: ["ADMIN", "COMMERCIAL"] },
      { to: "/gestao/pedidos", label: "Pedidos", icon: ShoppingCart, roles: ["ADMIN", "COMMERCIAL"] },
    ],
  },
  {
    label: "Administracao",
    items: [
      { to: "/gestao/usuarios", label: "Usuarios e perfis", icon: Users, roles: ["ADMIN"] },
      { to: "/gestao/auditoria", label: "Auditoria", icon: History, roles: ["ADMIN"] },
      { to: "/gestao/plataforma", label: "Administracao da plataforma", icon: Layers3, roles: ["ADMIN"] },
    ],
  },
];

/** Lista plana (todos os itens, sem grupo) - mantida para quem so' precisa iterar/achar
 * um item, sem se importar com a organizacao visual do menu. */
export const ADMIN_NAV: NavItem[] = ADMIN_NAV_GROUPS.flatMap((g) => g.items);
