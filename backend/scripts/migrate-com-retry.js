#!/usr/bin/env node
/**
 * Roda `prisma migrate deploy` com algumas tentativas antes de desistir.
 *
 * O Neon suspende o banco quando fica ocioso; o primeiro deploy depois disso
 * costuma falhar na conexao e so passa quando o Render tenta de novo sozinho -
 * o que custa alguns minutos de indisponibilidade a cada publicacao. Reencostar
 * aqui resolve na primeira, sem mudar nada do comportamento das migracoes.
 */
const { spawnSync } = require("node:child_process");

const TENTATIVAS = 5;
const ESPERA_MS = 5000;

for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa += 1) {
  const r = spawnSync("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit", shell: true });

  if (r.status === 0) process.exit(0);

  if (tentativa === TENTATIVAS) {
    console.error(`[migrate] falhou nas ${TENTATIVAS} tentativas; abortando o start.`);
    process.exit(r.status ?? 1);
  }

  console.error(`[migrate] tentativa ${tentativa} falhou (banco provavelmente hibernando); nova tentativa em ${ESPERA_MS / 1000}s.`);
  // espera sincrona: o processo nao tem nada a fazer ate o banco acordar
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ESPERA_MS);
}
