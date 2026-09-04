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

  // Erro de validacao do proprio zod (schema.parse fora de um ValidationError). Sem este
  // ramo qualquer campo mal preenchido virava "erro interno do servidor" - o usuario nao
  // ficava sabendo o que corrigir, e o log dava a impressao de bug no servidor.
  if (err instanceof ZodError) {
    const flat = err.flatten();
    const primeiro = Object.entries(flat.fieldErrors)[0];
    const mensagem = primeiro
      ? `${primeiro[0]}: ${primeiro[1]?.[0] ?? "valor invalido"}`
      : flat.formErrors[0] ?? "Dados invalidos.";
    res.status(422).json({ message: mensagem, code: "VALIDATION_ERROR", details: flat });
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
