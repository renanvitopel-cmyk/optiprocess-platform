import type { NextFunction, Request, Response } from "express";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "../lib/jwt";
import { UnauthorizedError } from "../utils/errors";

function extractToken(req: Request): string | null {
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
  if (cookieToken) return cookieToken;

  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice("Bearer ".length);

  return null;
}

/** Exige um usuario autenticado. Preenche req.user a partir do JWT valido. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    next(new UnauthorizedError("Faca login para continuar."));
    return;
  }

  try {
    req.user = verifyAuthToken(token);
    next();
  } catch {
    next(new UnauthorizedError());
  }
}

/** Preenche req.user se houver um token valido, mas nao bloqueia requisicoes sem sessao. */
export function attachUserIfPresent(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (token) {
    try {
      req.user = verifyAuthToken(token);
    } catch {
      // token invalido/expirado: segue como visitante anonimo
    }
  }
  next();
}
