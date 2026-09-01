import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError, ValidationError } from "../utils/errors";
import { env } from "../config/env";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ message: `Rota nao encontrada: ${req.method} ${req.path}` });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ValidationError) {
    const details = err.details instanceof ZodError ? err.details.flatten() : undefined;
    res.status(err.statusCode).json({ message: err.message, code: err.code, details });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message, code: err.code });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({ message: "Ja existe um registro com esses dados unicos.", code: "CONFLICT" });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ message: "Registro nao encontrado.", code: "NOT_FOUND" });
      return;
    }
  }

  // Erro inesperado: log completo no servidor, mensagem generica para o cliente.
  console.error(err);
  res.status(500).json({
    message: "Erro interno do servidor. Tente novamente em instantes.",
    code: "INTERNAL_ERROR",
    ...(env.isProduction ? {} : { debug: err instanceof Error ? err.message : String(err) }),
  });
}
