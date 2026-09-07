import type { Role } from "../api/types";

/**
 * Os perfis da equipe do cliente na tela.
 *
 * A regra de verdade mora no backend (src/lib/perfis.ts de la, cobrada em cada rota da
 * API). Aqui e' so o que a tela precisa para nao oferecer o que sera recusado: esconder o
 * botao nunca foi permissao, mas mostrar um botao que da erro tambem nao ajuda ninguem.
 */

export const ROTULO_DO_PERFIL: Record<Role, string> = {
  ADMIN: "Administrador OptiProcess",
  TECHNICIAN: "Tecnico OptiProcess",
  COMMERCIAL: "Comercial OptiProcess",
  CLIENT: "Administrador",
  CLIENT_PLANNER: "Planejador / Supervisor",
  CLIENT_TECHNICIAN: "Tecnico",
  REQUESTER: "Solicitante",
};

export const DESCRICAO_DO_PERFIL: Partial<Record<Role, string>> = {
  CLIENT: "Faz tudo na empresa, inclusive contrato e acessos",
  CLIENT_PLANNER: "Planeja, programa, aprova e encerra OS",
  CLIENT_TECHNICIAN: "Executa as OS: checklist, horas, materiais e conclusao",
  REQUESTER: "So abre e acompanha as proprias solicitacoes",
};

/** Perfis da equipe do cliente que ocupam vaga do plano. */
export const PERFIS_QUE_OCUPAM_VAGA: Role[] = ["CLIENT", "CLIENT_PLANNER", "CLIENT_TECHNICIAN"];

/** Espelha QUEM_GERENCIA_QUEM do backend: ninguem administra quem esta acima. */
const QUEM_GERENCIA_QUEM: Partial<Record<Role, Role[]>> = {
  ADMIN: ["CLIENT", "CLIENT_PLANNER", "CLIENT_TECHNICIAN", "REQUESTER"],
  CLIENT: ["CLIENT", "CLIENT_PLANNER", "CLIENT_TECHNICIAN", "REQUESTER"],
  CLIENT_PLANNER: ["CLIENT_TECHNICIAN", "REQUESTER"],
  CLIENT_TECHNICIAN: ["REQUESTER"],
  REQUESTER: [],
};

export function perfisQuePodeGerenciar(quem?: Role): Role[] {
  return quem ? QUEM_GERENCIA_QUEM[quem] ?? [] : [];
}

/** Quem planeja: monta plano, programa e aprova. O Tecnico executa, mas nao reestrutura. */
export function podePlanejar(role?: Role): boolean {
  return role === "ADMIN" || role === "CLIENT" || role === "CLIENT_PLANNER";
}

/** Quem responde pelo contrato e pelos cadastros estruturais da empresa. */
export function ehAdministradorDaEmpresa(role?: Role): boolean {
  return role === "ADMIN" || role === "CLIENT";
}
