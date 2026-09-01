import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
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
