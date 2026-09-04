import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Gauge,
  BadgeCheck,
  FileWarning,
  ClipboardList,
  ClipboardPlus,
  FileSignature,
  ShoppingCart,
  User,
  Wrench,
  ShieldCheck,
  Boxes,
  CalendarDays,
  BarChart3,
  SlidersHorizontal,
  Radar,
  Droplets,
  MapPin,
  Route,
  FlaskConical,
  TrendingUp,
  History,
} from "lucide-react";
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

export interface PortalNavSection {
  /** Titulo do grupo; vazio no primeiro bloco, que nao precisa de rotulo. */
  title?: string;
  items: PortalNavItem[];
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

/**
 * O menu segue o dia a dia de quem opera a manutencao: primeiro o que se usa toda hora,
 * depois analise, depois o que a OptiProcess presta como servico, e por ultimo os
 * cadastros (que se configura uma vez). Catalogo nenhum ganha item proprio no menu -
 * todos ficam dentro de "Cadastros".
 */
const PORTAL_NAV_SECTIONS: PortalNavSection[] = [
  {
    items: [{ to: "/portal", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    // O dia a dia: o que se abre, programa e executa. Separado da "Gestao" (o parque, o
    // estoque, o acompanhamento de condicao) porque sao rotinas de pessoas diferentes -
    // e porque um unico bloco de nove itens ja nao era um menu, era uma lista.
    title: "Operacional",
    items: [
      { to: "/portal/manutencao", label: "Painel do CMMS", icon: Wrench, requires: ["CMMS_MAINTENANCE"], exact: true },
      { to: "/portal/manutencao/solicitacoes", label: "Solicitacoes", icon: ClipboardPlus, requires: ["CMMS_MAINTENANCE"] },
      { to: "/portal/manutencao/ordens", label: "Ordens de manutencao", icon: ClipboardList, requires: ["CMMS_MAINTENANCE"] },
      { to: "/portal/manutencao/programacao", label: "Programacao", icon: CalendarDays, requires: ["CMMS_MAINTENANCE"] },
      { to: "/portal/manutencao/planos", label: "Planos preventivos", icon: ShieldCheck, requires: ["CMMS_MAINTENANCE"] },
    ],
  },
  {
    // Lubrificacao tem topico proprio: e' um ciclo inteiro (lubrificante no almoxarifado ->
    // ponto -> rota -> aplicacao -> previsao de consumo), com rotina e responsavel proprios,
    // e nao um item solto dentro de manutencao.
    title: "Lubrificacao",
    items: [
      { to: "/portal/lubrificacao", label: "Painel", icon: Droplets, requires: ["CMMS_MAINTENANCE"], exact: true },
      { to: "/portal/lubrificacao/pontos", label: "Pontos", icon: MapPin, requires: ["CMMS_MAINTENANCE"] },
      { to: "/portal/lubrificacao/rotas", label: "Rotas", icon: Route, requires: ["CMMS_MAINTENANCE"] },
      { to: "/portal/lubrificacao/lubrificantes", label: "Lubrificantes", icon: FlaskConical, requires: ["CMMS_MAINTENANCE"] },
      { to: "/portal/lubrificacao/previsao", label: "Previsao de consumo", icon: TrendingUp, requires: ["CMMS_MAINTENANCE"] },
      { to: "/portal/lubrificacao/historico", label: "Historico", icon: History, requires: ["CMMS_MAINTENANCE"] },
    ],
  },
  {
    title: "Gestao",
    items: [
      { to: "/portal/instrumentos", label: "Meus ativos", icon: Gauge, requires: ["CALIBRATION", "CMMS_MAINTENANCE"] },
      { to: "/portal/almoxarifado", label: "Almoxarifado", icon: Boxes, requires: ["CMMS_MAINTENANCE"] },
      { to: "/portal/manutencao/preditiva", label: "Preditiva", icon: Radar, requires: ["CMMS_MAINTENANCE"] },
      { to: "/portal/manutencao/pareto", label: "Falhas e RCA", icon: BarChart3, requires: ["CMMS_MAINTENANCE"] },
    ],
  },
  {
    title: "Servicos OptiProcess",
    items: [
      // "Ordem de manutencao" (CMMS, executada pela propria equipe do cliente) e "ordens de
      // servico" (atendimento tecnico feito pela OptiProcess) sao coisas diferentes - o
      // rotulo deixa isso explicito para nao ficarem parecidas demais no menu.
      { to: "/portal/ordens-servico", label: "Ordens de servico externas", icon: ClipboardList, requires: ALL_SERVICES },
      { to: "/portal/certificados", label: "Certificados", icon: BadgeCheck, requires: ["CALIBRATION"] },
      { to: "/portal/laudos", label: "Laudos tecnicos", icon: FileWarning, requires: ["TECHNICAL_REPORT"] },
      { to: "/portal/contratos", label: "Contratos", icon: FileSignature, requires: ALL_SERVICES },
      { to: "/portal/pedidos", label: "Pedidos e orcamentos", icon: ShoppingCart },
    ],
  },
  {
    title: "Configuracao",
    items: [
      { to: "/portal/instrumentos/cadastros", label: "Cadastros", icon: SlidersHorizontal, requires: ["CALIBRATION", "CMMS_MAINTENANCE"] },
      { to: "/portal/perfil", label: "Meu perfil", icon: User },
    ],
  },
];

/** Filtra o menu do portal pelas areas de servico que o cliente contratou, descartando
 * secoes que ficaram vazias depois do filtro. */
export function getPortalNav(contractedServices: ServiceCategory[]): PortalNavSection[] {
  return PORTAL_NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.requires || item.requires.some((c) => contractedServices.includes(c))),
  })).filter((section) => section.items.length > 0);
}
