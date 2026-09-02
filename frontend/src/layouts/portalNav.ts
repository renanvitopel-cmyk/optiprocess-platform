import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Gauge, BadgeCheck, FileWarning, ClipboardList, FileSignature, ShoppingCart, User, Wrench, ShieldCheck, ListChecks, Boxes } from "lucide-react";
import type { ServiceCategory } from "../api/types";

export interface PortalNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Servicos que liberam este item; omitido = sempre visivel (dashboard, pedidos, perfil). */
  requires?: ServiceCategory[];
  /** So marca como ativo na rota exata - usado nos itens que sao "pai" de sub-rotas. */
  exact?: boolean;
}

const PORTAL_NAV_ITEMS: PortalNavItem[] = [
  { to: "/portal", label: "Dashboard", icon: LayoutDashboard },
  // Quem contrata o CMMS tem ele como o programa principal: fica logo apos o Dashboard
  // (que ja mostra o CMMS como conteudo central para esse cliente), o resto vira incremento.
  { to: "/portal/manutencao", label: "RLP Maintenance CMMS", icon: Wrench, requires: ["CMMS_MAINTENANCE"], exact: true },
  { to: "/portal/manutencao/planos", label: "Planos de manutencao", icon: ShieldCheck, requires: ["CMMS_MAINTENANCE"] },
  { to: "/portal/manutencao/ordens", label: "Ordens de manutencao", icon: ClipboardList, requires: ["CMMS_MAINTENANCE"] },
  { to: "/portal/manutencao/falhas", label: "Codigos de falha", icon: ListChecks, requires: ["CMMS_MAINTENANCE"] },
  { to: "/portal/almoxarifado", label: "Meu almoxarifado", icon: Boxes, requires: ["CMMS_MAINTENANCE"] },
  { to: "/portal/instrumentos", label: "Meus ativos", icon: Gauge, requires: ["CALIBRATION", "CMMS_MAINTENANCE"] },
  { to: "/portal/certificados", label: "Meus certificados", icon: BadgeCheck, requires: ["CALIBRATION"] },
  { to: "/portal/laudos", label: "Meus laudos", icon: FileWarning, requires: ["TECHNICAL_REPORT"] },
  {
    to: "/portal/ordens-servico",
    label: "Minhas ordens de servico",
    icon: ClipboardList,
    requires: [
      "ELECTRICAL_MAINTENANCE",
      "PANEL_MAINTENANCE",
      "MOTOR_MAINTENANCE",
      "TECHNICAL_REPORT",
      "CALIBRATION",
      "TECHNICAL_ASSISTANCE",
      "EV_CHARGER",
      "CMMS_MAINTENANCE",
      "OTHER",
    ],
  },
  { to: "/portal/contratos", label: "Meus contratos", icon: FileSignature, requires: ["ELECTRICAL_MAINTENANCE", "PANEL_MAINTENANCE", "MOTOR_MAINTENANCE", "TECHNICAL_REPORT", "CALIBRATION", "TECHNICAL_ASSISTANCE", "EV_CHARGER", "CMMS_MAINTENANCE", "OTHER"] },
  { to: "/portal/pedidos", label: "Meus pedidos e orcamentos", icon: ShoppingCart },
  { to: "/portal/perfil", label: "Meu perfil", icon: User },
];

/** Filtra o menu do portal pelas areas de servico que o cliente contratou. */
export function getPortalNav(contractedServices: ServiceCategory[]): PortalNavItem[] {
  return PORTAL_NAV_ITEMS.filter((item) => !item.requires || item.requires.some((c) => contractedServices.includes(c)));
}
