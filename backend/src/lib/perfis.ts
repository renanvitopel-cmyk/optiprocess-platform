import type { Role } from "@prisma/client";

/**
 * Os perfis da equipe do CLIENTE, e o que cada um alcanca.
 *
 * Um so lugar decide isso, porque a mesma regra e' cobrada em tres camadas: no menu, na
 * rota da tela e na API. Esconder o botao nao e' permissao - quem sabe a URL entra do
 * mesmo jeito -, entao o que vale e' o que esta aqui, usado pelo requireRole de cada rota.
 */

/** Administrador da empresa. O enum continua CLIENT para nao renomear producao. */
export const CLIENT_ADMIN: Role = "CLIENT";
export const CLIENT_PLANNER: Role = "CLIENT_PLANNER";
export const CLIENT_TECHNICIAN: Role = "CLIENT_TECHNICIAN";
export const REQUESTER: Role = "REQUESTER";

/** Tudo que pertence a uma empresa e' visto so dentro dela. */
export const PERFIS_DA_EMPRESA: Role[] = [CLIENT_ADMIN, CLIENT_PLANNER, CLIENT_TECHNICIAN, REQUESTER];

/**
 * Quem ocupa vaga do plano. O Solicitante nao: ele so avisa que a maquina esta ruim, e
 * cobrar por isso afastaria justamente quem precisa avisar.
 */
export const PERFIS_QUE_OCUPAM_VAGA: Role[] = [CLIENT_ADMIN, CLIENT_PLANNER, CLIENT_TECHNICIAN];

/** Quem planeja: monta plano, programa, aprova e encerra OS. */
export const PERFIS_QUE_PLANEJAM: Role[] = ["ADMIN", CLIENT_ADMIN, CLIENT_PLANNER];

/** Quem executa: alcanca a OS para trabalhar nela, mas nao para reestrutura-la. */
export const PERFIS_QUE_EXECUTAM: Role[] = ["ADMIN", CLIENT_ADMIN, CLIENT_PLANNER, CLIENT_TECHNICIAN];

/** Quem mexe no contrato, no plano e nos dados comerciais da empresa. */
export const PERFIS_COMERCIAIS: Role[] = ["ADMIN", CLIENT_ADMIN];

/** Quem abre solicitacao de servico - todo mundo do lado do cliente. */
export const PERFIS_QUE_SOLICITAM: Role[] = ["ADMIN", ...PERFIS_DA_EMPRESA];

/**
 * Quais perfis cada um pode criar, editar, desativar e ter a senha redefinida.
 *
 * A regra e' a mesma da vida real: ninguem administra quem esta acima. O Planejador cuida
 * do time de execucao, o Tecnico so cadastra quem vai abrir solicitacao no chao de fabrica,
 * e o Solicitante nao administra ninguem.
 */
const QUEM_GERENCIA_QUEM: Partial<Record<Role, Role[]>> = {
  ADMIN: [CLIENT_ADMIN, CLIENT_PLANNER, CLIENT_TECHNICIAN, REQUESTER],
  [CLIENT_ADMIN]: [CLIENT_ADMIN, CLIENT_PLANNER, CLIENT_TECHNICIAN, REQUESTER],
  [CLIENT_PLANNER]: [CLIENT_TECHNICIAN, REQUESTER],
  [CLIENT_TECHNICIAN]: [REQUESTER],
  [REQUESTER]: [],
};

export function perfisQuePodeGerenciar(quem: Role): Role[] {
  return QUEM_GERENCIA_QUEM[quem] ?? [];
}

export function podeGerenciarPerfil(quem: Role, alvo: Role): boolean {
  return perfisQuePodeGerenciar(quem).includes(alvo);
}

/** Rotulos em portugues - usados nas mensagens de erro da API e na tela. */
export const ROTULO_DO_PERFIL: Record<string, string> = {
  ADMIN: "Administrador OptiProcess",
  TECHNICIAN: "Tecnico OptiProcess",
  COMMERCIAL: "Comercial OptiProcess",
  [CLIENT_ADMIN]: "Administrador",
  [CLIENT_PLANNER]: "Planejador / Supervisor",
  [CLIENT_TECHNICIAN]: "Tecnico",
  [REQUESTER]: "Solicitante",
};
