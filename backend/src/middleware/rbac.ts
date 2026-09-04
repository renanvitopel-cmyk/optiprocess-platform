import type { NextFunction, Request, Response } from "express";
import type { Role, ServiceCategory } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ForbiddenError, UnauthorizedError, ValidationError } from "../utils/errors";

/** Restringe a rota a um conjunto de papeis. Use depois de requireAuth. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError());
      return;
    }
    next();
  };
}

/** Papeis internos da empresa (tudo que nao e o portal do cliente). */
export const STAFF_ROLES: Role[] = ["ADMIN", "TECHNICIAN", "COMMERCIAL"];

/**
 * Quem opera o RLP Maintenance CMMS.
 *
 * O CMMS e' um produto que a OptiProcess VENDE - quem faz a manutencao da fabrica e' a
 * equipe do proprio cliente, nao a OptiProcess. Por isso TECHNICIAN e COMMERCIAL (que
 * cuidam dos servicos prestados pela OptiProcess: calibracao, laudos, OS externas) nao
 * entram aqui.
 *
 * ADMIN fica como acesso master do dono da plataforma - suporte e administracao.
 */
export const CMMS_ROLES: Role[] = ["ADMIN", "CLIENT"];

/** Perfis presos a uma empresa: tudo o que fazem e' dentro do proprio clientId. O
 * Solicitante entra aqui junto do CLIENT - a diferenca entre os dois nao e' o escopo de
 * empresa, e' o que cada um pode fazer dentro dela. */
export const CLIENT_SCOPED_ROLES: Role[] = ["CLIENT", "REQUESTER"];

/** true quando o usuario da requisicao esta preso a uma empresa (e, portanto, tem clientId). */
function presoAoCliente(req: Request): req is Request & { user: { role: Role; clientId?: string | null; sub: string } } {
  return !!req.user && CLIENT_SCOPED_ROLES.includes(req.user.role);
}

/** Garante que um usuario preso a uma empresa (CLIENT/REQUESTER) so acesse dados dela.
 * Uso: validar o :clientId de rota, ou aplicar como filtro obrigatorio em queries. */
export function assertOwnClient(req: Request, clientId: string): void {
  if (presoAoCliente(req) && req.user.clientId !== clientId) {
    throw new ForbiddenError("Voce nao tem acesso aos dados de outra empresa.");
  }
}

/**
 * Varios modulos (instrumentos, calibracoes, laudos, OS, contratos, pedidos) sao
 * consultados tanto pela equipe interna quanto pelo portal do cliente. Em vez de
 * duplicar list/get, o controller chama isso e usa o resultado como filtro extra
 * do Prisma: {} para equipe (sem restricao) ou { clientId } forcado para CLIENT,
 * nunca confiando em um clientId vindo da query string do proprio cliente.
 */
export function clientScopeFilter(req: Request): { clientId?: string } {
  if (presoAoCliente(req)) {
    if (!req.user.clientId) throw new ForbiddenError();
    return { clientId: req.user.clientId };
  }
  return {};
}

export const CLIENT_PORTAL_ROLES: Role[] = ["ADMIN", "TECHNICIAN", "COMMERCIAL", "CLIENT"];

/**
 * Quem pode abrir solicitacao de servico: a equipe do cliente, o Solicitante (que so faz
 * isso) e o ADMIN pelo acesso master. E' a unica porta do Solicitante no sistema - ele nao
 * alcanca ativos, ordens, planos nem estoque.
 */
export const SERVICE_REQUEST_ROLES: Role[] = ["ADMIN", "CLIENT", "REQUESTER"];

/**
 * Espelho do clientScopeFilter para criacao: um usuario CLIENT sempre grava no proprio
 * clientId (o que vier no corpo e' ignorado), enquanto a equipe interna precisa informar
 * explicitamente para qual empresa o registro esta sendo criado.
 */
export function resolveClientId(req: Request, bodyClientId?: string | null): string {
  if (presoAoCliente(req)) {
    if (!req.user.clientId) throw new ForbiddenError();
    return req.user.clientId;
  }
  if (!bodyClientId) throw new ValidationError("Informe o cliente.");
  return bodyClientId;
}

/**
 * Servicos que a empresa do usuario CLIENT contratou (campo Client.contractedServices),
 * usado para liberar cada area do portal (instrumentos/certificados, laudos, contratos,
 * ordens de servico) apenas para quem de fato contratou aquele servico. Para a equipe
 * interna (ADMIN/TECHNICIAN/COMMERCIAL) retorna null, que significa "sem restricao".
 * Consulta sempre o banco (nao o JWT) para refletir na hora qualquer mudanca feita
 * pelo admin na ficha do cliente.
 */
export async function contractedServicesFilter(req: Request): Promise<ServiceCategory[] | null> {
  // O Solicitante tambem e' do cliente: se a empresa nao contratou o CMMS, ele nao abre
  // solicitacao nenhuma - a checagem vale para os dois perfis.
  if (!presoAoCliente(req)) return null;
  if (!req.user.clientId) throw new ForbiddenError();

  const client = await prisma.client.findUnique({
    where: { id: req.user.clientId },
    select: { contractedServices: true },
  });
  if (!client) throw new ForbiddenError();
  return client.contractedServices;
}

/** Bloqueia o acesso quando o cliente nao contratou nenhum dos servicos informados. */
export async function assertServiceAccess(req: Request, allowed: ServiceCategory[]): Promise<void> {
  const services = await contractedServicesFilter(req);
  if (services === null) return; // equipe interna: sem restricao
  if (!allowed.some((c) => services.includes(c))) {
    throw new ForbiddenError("Este servico nao esta liberado para o seu acesso no portal.");
  }
}
