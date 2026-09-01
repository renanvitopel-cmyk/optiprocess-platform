import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Gauge, BadgeCheck, FileWarning, ClipboardList, FileSignature, ShoppingCart, User } from "lucide-react";

export interface PortalNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const PORTAL_NAV: PortalNavItem[] = [
  { to: "/portal", label: "Dashboard", icon: LayoutDashboard },
  { to: "/portal/instrumentos", label: "Meus instrumentos", icon: Gauge },
  { to: "/portal/certificados", label: "Meus certificados", icon: BadgeCheck },
  { to: "/portal/laudos", label: "Meus laudos", icon: FileWarning },
  { to: "/portal/ordens-servico", label: "Minhas ordens de servico", icon: ClipboardList },
  { to: "/portal/contratos", label: "Meus contratos", icon: FileSignature },
  { to: "/portal/pedidos", label: "Meus pedidos e orcamentos", icon: ShoppingCart },
  { to: "/portal/perfil", label: "Meu perfil", icon: User },
];
