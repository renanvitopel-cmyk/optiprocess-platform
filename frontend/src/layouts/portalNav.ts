import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Gauge,
  BadgeCheck,
  FileWarning,
  ClipboardList,
  User,
  SlidersHorizontal,
  ReceiptText,
  LayoutGrid,
  Briefcase,
  Settings,
} from "lucide-react";
import type { Role, ServiceCategory } from "../api/types";

export interface PortalNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Servicos que liberam este item; omitido = sempre visivel (dashboard, pedidos, perfil). */
  requires?: ServiceCategory[];
  /** So marca como ativo na rota exata - usado nos itens que sao "pai" de sub-rotas. */
  exact?: boolean;
  /** Perfis que veem o item. Omitido = toda a equipe (nao o Solicitante, que tem menu
   * proprio). O menu acompanha as rotas: item que leva a uma tela bloqueada so faz a
   * pessoa bater na porta fechada. */
  perfis?: Role[];
}

export interface PortalNavSection {
  /** Titulo do grupo; vazio no primeiro bloco, que nao precisa de rotulo. */
  title?: string;
  /** Icone do grupo - o cabecalho tem o mesmo peso visual dos itens, entao precisa de um
   * icone tambem: sem ele a linha do titulo ficava desalinhada das de baixo. */
  icon?: LucideIcon;
  items: PortalNavItem[];
  /** Comeca recolhida. Serve para o que nao se usa todo dia nao competir com o que se usa. */
  defaultCollapsed?: boolean;
}

const ALL_SERVICES: ServiceCategory[] = [
  "ELECTRICAL_MAINTENANCE",
  "PANEL_MAINTENANCE",
  "MOTOR_MAINTENANCE",
  "TECHNICAL_REPORT",
  "CALIBRATION",
  "TECHNICAL_ASSISTANCE",
  "EV_CHARGER",
  "CMMS_MAINTENANCE",
  "OTHER",
];

const PORTAL_NAV_SECTIONS: PortalNavSection[] = [
  {
    items: [{ to: "/portal", label: "Dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    title: "Gestao",
    icon: LayoutGrid,
    defaultCollapsed: true,
    items: [
      { perfis: ["CLIENT", "CLIENT_PLANNER"], to: "/portal/instrumentos/cadastros", label: "Cadastros tecnicos", icon: SlidersHorizontal, requires: ["CALIBRATION"] },
      { to: "/portal/instrumentos", label: "Meus ativos", icon: Gauge, requires: ["CALIBRATION"] },
    ],
  },
  {
    title: "Servicos OptiProcess",
    icon: Briefcase,
    defaultCollapsed: true,
    items: [
      { to: "/portal/ordens-servico", label: "Ordens de servico externas", icon: ClipboardList, requires: ALL_SERVICES },
      { to: "/portal/certificados", label: "Certificados", icon: BadgeCheck, requires: ["CALIBRATION"] },
      { to: "/portal/laudos", label: "Laudos tecnicos", icon: FileWarning, requires: ["TECHNICAL_REPORT"] },
    ],
  },
  {
    title: "Configuracao",
    icon: Settings,
    items: [
      { perfis: ["CLIENT"], to: "/portal/contrato", label: "Meu contrato", icon: ReceiptText },
      { to: "/portal/perfil", label: "Meu perfil", icon: User },
    ],
  },
];

/** Filtra o menu do portal pelas areas de servico que o cliente contratou, descartando
 * secoes que ficaram vazias depois do filtro. */
/** O Solicitante ve um menu de uma linha: so o proprio perfil. Mostrar o resto
 * desabilitado so criaria a impressao de que ele deveria ter acesso. */
const NAV_DO_SOLICITANTE: PortalNavSection[] = [
  {
    items: [{ to: "/portal/perfil", label: "Meu perfil", icon: User }],
  },
];

export function getPortalNav(contractedServices: ServiceCategory[], role?: string): PortalNavSection[] {
  if (role === "REQUESTER") return NAV_DO_SOLICITANTE;

  return PORTAL_NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        (!item.requires || item.requires.some((c) => contractedServices.includes(c))) &&
        // O ADMIN da OptiProcess entra por acesso master de suporte: ve tudo.
        (!item.perfis || !role || role === "ADMIN" || item.perfis.includes(role as Role)),
    ),
  })).filter((section) => section.items.length > 0);
}

/** Secoes que comecam recolhidas na primeira visita - o que nao se usa todo dia nao precisa
 * competir por espaco com o que se usa. Depois vale a escolha do proprio usuario. */
export const PORTAL_NAV_PADRAO_FECHADO: string[] = PORTAL_NAV_SECTIONS.filter((s) => s.defaultCollapsed && s.title).map(
  (s) => s.title as string,
);
