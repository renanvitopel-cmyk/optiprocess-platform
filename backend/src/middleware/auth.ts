import type { NextFunction, Request, Response } from "express";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "../lib/jwt";
import { ForbiddenError, UnauthorizedError } from "../utils/errors";

function extractToken(req: Request): string | null {
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
  if (cookieToken) return cookieToken;

  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice("Bearer ".length);

  return null;
}

/**
 * Enquanto a senha for provisoria, o sistema so responde ao necessario para troca-la.
 *
 * Nao basta a tela levar para a troca: quem fecha o modal, ou chama a API direto, estaria
 * usando o sistema com uma senha que passou por e-mail ou papel. A resposta traz um codigo
 * proprio para a tela saber levar a pessoa ao lugar certo, em vez de mostrar "sem acesso".
 */
export function blockUntilPasswordChanged(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user?.mustChangePassword) {
    next();
    return;
  }
  const liberado = ["/api/auth/me", "/api/auth/change-password", "/api/auth/logout"];
  if (liberado.includes(req.originalUrl.split("?")[0])) {
    next();
    return;
  }
  next(new ForbiddenError("Troque a senha provisoria para continuar.", "MUST_CHANGE_PASSWORD"));
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
  } catch {
    next(new UnauthorizedError());
    return;
  }

  // Senha provisoria segura tudo: nao adianta a tela levar para a troca se a API continua
  // respondendo a quem fechar o modal ou chamar direto.
  blockUntilPasswordChanged(req, _res, next);
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
