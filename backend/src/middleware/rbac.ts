import type { NextFunction, Request, Response } from "express";
import type { Role, ServiceCategory } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ForbiddenError, UnauthorizedError } from "../utils/errors";

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

/** Garante que um usuario CLIENT so acesse dados do proprio clientId.
 * Uso: validar o :clientId de rota, ou aplicar como filtro obrigatorio em queries. */
export function assertOwnClient(req: Request, clientId: string): void {
  if (req.user?.role === "CLIENT" && req.user.clientId !== clientId) {
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
  if (req.user?.role === "CLIENT") {
    if (!req.user.clientId) throw new ForbiddenError();
    return { clientId: req.user.clientId };
  }
  return {};
}

export const CLIENT_PORTAL_ROLES: Role[] = ["ADMIN", "TECHNICIAN", "COMMERCIAL", "CLIENT"];

/**
 * Servicos que a empresa do usuario CLIENT contratou (campo Client.contractedServices),
 * usado para liberar cada area do portal (instrumentos/certificados, laudos, contratos,
 * ordens de servico) apenas para quem de fato contratou aquele servico. Para a equipe
 * interna (ADMIN/TECHNICIAN/COMMERCIAL) retorna null, que significa "sem restricao".
 * Consulta sempre o banco (nao o JWT) para refletir na hora qualquer mudanca feita
 * pelo admin na ficha do cliente.
 */
export async function contractedServicesFilter(req: Request): Promise<ServiceCategory[] | null> {
  if (req.user?.role !== "CLIENT") return null;
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
