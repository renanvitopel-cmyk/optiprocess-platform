import { PrismaClient, Prisma } from "@prisma/client";
import { env } from "../config/env";

// Uma unica instancia reutilizada em toda a aplicacao (evita abrir varias pools
// de conexao). Em dev com hot-reload, guarda a instancia no objeto global para
// nao recriar o client a cada reinicio do tsx watch.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * Erros em que a consulta NAO chegou a rodar no banco.
 *
 * - P1001: nao alcancou o servidor;
 * - P1017: o servidor fechou a conexao;
 * - P2024: estourou o tempo esperando uma conexao livre da pool.
 *
 * Os tres sao de CONEXAO, e e' isso que torna a nova tentativa segura: nenhuma linha foi
 * lida ou gravada, entao repetir nao duplica nada - inclusive numa escrita.
 */
const ERROS_DE_CONEXAO = new Set(["P1001", "P1017", "P2024"]);

export function ehFalhaDeConexao(erro: unknown): boolean {
  if (erro instanceof Prisma.PrismaClientKnownRequestError) return ERROS_DE_CONEXAO.has(erro.code);
  // O "nao consegui iniciar o motor/conectar" vem como erro de inicializacao, sem code
  // dentro do conjunto acima - e e' exatamente o do banco dormindo.
  return erro instanceof Prisma.PrismaClientInitializationError;
}

const ESPERA_MS = 600;

export function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const base = new PrismaClient({
  log: env.isProduction ? ["error", "warn"] : ["warn", "error"],
});

/**
 * Uma segunda tentativa quando o banco estava dormindo.
 *
 * O Neon no plano gratuito suspende a instancia por inatividade. A primeira consulta que
 * chega DEPOIS da suspensao e' quem acorda o banco - e falha, porque a conexao nao sobe a
 * tempo. Na pratica isso aparecia assim: o primeiro visitante do site via a vitrine de
 * produtos vazia (500 em /api/products), e qualquer recarga funcionava. Medido: 500 na
 * primeira chamada, 200 nas seis seguintes, entre 0,4 e 0,8 s.
 *
 * Por que uma tentativa so', e com 600 ms: o tempo de acordar o Neon e' da ordem de
 * centenas de milissegundos. Repetir varias vezes em cima de um banco fora do ar (que e' o
 * outro motivo possivel para P1001) so' faria o visitante esperar mais para ver o mesmo
 * erro - e seguraria uma conexao do servico parada no meio.
 *
 * Repete so' falha de CONEXAO: erro de regra (unicidade, registro nao encontrado, dado
 * invalido) e' resposta legitima do banco e repetir nao muda nada.
 */
export const prisma =
  global.__prisma ??
  base.$extends({
    query: {
      async $allOperations({ args, query }) {
        try {
          return await query(args);
        } catch (erro) {
          if (!ehFalhaDeConexao(erro)) throw erro;
          await esperar(ESPERA_MS);
          return query(args);
        }
      },
    },
  });

if (!env.isProduction) {
  global.__prisma = prisma as unknown as PrismaClient;
}
