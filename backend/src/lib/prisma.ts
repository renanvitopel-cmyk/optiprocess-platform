import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";

// Uma unica instancia reutilizada em toda a aplicacao (evita abrir varias pools
// de conexao). Em dev com hot-reload, guarda a instancia no objeto global para
// nao recriar o client a cada reinicio do tsx watch.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: env.isProduction ? ["error", "warn"] : ["warn", "error"],
  });

if (!env.isProduction) {
  global.__prisma = prisma;
}
