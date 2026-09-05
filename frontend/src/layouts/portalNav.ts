import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Gauge,
  BadgeCheck,
  FileWarning,
  ClipboardList,
  ClipboardPlus,
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
  ReceiptText,
  HardHat,
  Droplet,
  LayoutGrid,
  Briefcase,
  Settings,
  FileSpreadsheet,
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
    icon: HardHat,
    items: [
      { to: "/portal/manutencao", label: "Painel do CMMS", icon: Wrench, requires: ["CMMS_MAINTENANCE"], exact: true },
      { to: "/portal/manutencao/solicitacoes", label: "Solicitacoes", icon: ClipboardPlus, requires: ["CMMS_MAINTENANCE"] },
      { to: "/portal/manutencao/ordens", label: "Ordens de manutencao", icon: ClipboardList, requires: ["CMMS_MAINTENANCE"] },
      { to: "/portal/manutencao/programacao", label: "Programacao", icon: CalendarDays, requires: ["CMMS_MAINTENANCE"] },
      { to: "/portal/manutencao/planos", label: "Planos preventivos", icon: ShieldCheck, requires: ["CMMS_MAINTENANCE"] },
      { to: "/portal/manutencao/preditiva", label: "Preditiva", icon: Radar, requires: ["CMMS_MAINTENANCE"] },
    ],
  },
  {
    // Lubrificacao tem topico proprio: e' um ciclo inteiro (lubrificante no almoxarifado ->
    // ponto -> rota -> aplicacao -> previsao de consumo), com rotina e responsavel proprios,
    // e nao um item solto dentro de manutencao.
    title: "Lubrificacao",
    icon: Droplet,
    defaultCollapsed: true,
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
    icon: LayoutGrid,
    defaultCollapsed: true,
    items: [
      { to: "/portal/instrumentos", label: "Meus ativos", icon: Gauge, requires: ["CALIBRATION", "CMMS_MAINTENANCE"] },
      { to: "/portal/almoxarifado", label: "Almoxarifado", icon: Boxes, requires: ["CMMS_MAINTENANCE"] },
      { to: "/portal/manutencao/pareto", label: "Falhas e RCA", icon: BarChart3, requires: ["CMMS_MAINTENANCE"] },
    ],
  },
  {
    title: "Servicos OptiProcess",
    icon: Briefcase,
    defaultCollapsed: true,
    items: [
      // "Ordem de manutencao" (CMMS, executada pela propria equipe do cliente) e "ordens de
      // servico" (atendimento tecnico feito pela OptiProcess) sao coisas diferentes - o
      // rotulo deixa isso explicito para nao ficarem parecidas demais no menu.
      { to: "/portal/ordens-servico", label: "Ordens de servico externas", icon: ClipboardList, requires: ALL_SERVICES },
      { to: "/portal/certificados", label: "Certificados", icon: BadgeCheck, requires: ["CALIBRATION"] },
      { to: "/portal/laudos", label: "Laudos tecnicos", icon: FileWarning, requires: ["TECHNICAL_REPORT"] },
    ],
  },
  {
    title: "Configuracao",
    icon: Settings,
    items: [
      { to: "/portal/instrumentos/cadastros", label: "Cadastros", icon: SlidersHorizontal, requires: ["CALIBRATION", "CMMS_MAINTENANCE"] },
      { to: "/portal/manutencao/importar", label: "Importar dados", icon: FileSpreadsheet, requires: ["CMMS_MAINTENANCE"] },
      { to: "/portal/contrato", label: "Meu contrato", icon: ReceiptText },
      { to: "/portal/perfil", label: "Meu perfil", icon: User },
    ],
  },
];

/** Filtra o menu do portal pelas areas de servico que o cliente contratou, descartando
 * secoes que ficaram vazias depois do filtro. */
/** O Solicitante ve um menu de duas linhas: abrir solicitacao e o proprio perfil. Mostrar
 * o resto desabilitado so criaria a impressao de que ele deveria ter acesso. */
const NAV_DO_SOLICITANTE: PortalNavSection[] = [
  {
    items: [
      { to: "/portal/manutencao/solicitacoes", label: "Minhas solicitacoes", icon: ClipboardPlus },
      { to: "/portal/perfil", label: "Meu perfil", icon: User },
    ],
  },
];

export function getPortalNav(contractedServices: ServiceCategory[], role?: string): PortalNavSection[] {
  if (role === "REQUESTER") return NAV_DO_SOLICITANTE;

  return PORTAL_NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.requires || item.requires.some((c) => contractedServices.includes(c))),
  })).filter((section) => section.items.length > 0);
}

/** Secoes que comecam recolhidas na primeira visita - o que nao se usa todo dia nao precisa
 * competir por espaco com o que se usa. Depois vale a escolha do proprio usuario. */
export const PORTAL_NAV_PADRAO_FECHADO: string[] = PORTAL_NAV_SECTIONS.filter((s) => s.defaultCollapsed && s.title).map(
  (s) => s.title as string,
);
