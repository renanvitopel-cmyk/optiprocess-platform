import { prisma } from "./prisma";
import { ValidationError } from "../utils/errors";

/** Sem plano atribuido = sem limite (todo cliente cadastrado antes da Fase 7 continua
 * exatamente como estava). So bloqueia quando ha um plano com o limite especifico definido. */
export async function assertUserLimitNotExceeded(clientId: string) {
  const client = await prisma.client.findFirst({ where: { id: clientId }, select: { plan: { select: { name: true, maxUsers: true } } } });
  if (!client?.plan || client.plan.maxUsers == null) return;

  // Solicitante nao consome vaga: ele so abre solicitacao de servico, e cobrar por quem
  // avisa que a maquina esta ruim afastaria justamente quem precisa avisar.
  const current = await prisma.user.count({ where: { clientId, deletedAt: null, role: { not: "REQUESTER" } } });
  if (current >= client.plan.maxUsers) {
    throw new ValidationError(
      `Limite de usuarios do plano "${client.plan.name}" atingido (${current}/${client.plan.maxUsers}). Aumente o plano do cliente para liberar mais acessos.`,
    );
  }
}

export async function assertInstrumentLimitNotExceeded(clientId: string) {
  const client = await prisma.client.findFirst({ where: { id: clientId }, select: { plan: { select: { name: true, maxInstruments: true } } } });
  if (!client?.plan || client.plan.maxInstruments == null) return;

  const current = await prisma.instrument.count({ where: { clientId, deletedAt: null } });
  if (current >= client.plan.maxInstruments) {
    throw new ValidationError(
      `Limite de ativos do plano "${client.plan.name}" atingido (${current}/${client.plan.maxInstruments}). Aumente o plano do cliente para cadastrar mais ativos.`,
    );
  }
}

/** Uso atual do cliente frente ao plano - usado na ficha do cliente e no dashboard da
 * plataforma. limit null = sem limite (nunca mostra porcentagem enganosa nesse caso). */
export async function getClientPlanUsage(clientId: string) {
  const client = await prisma.client.findFirst({ where: { id: clientId }, select: { plan: true } });
  const [users, instruments] = await Promise.all([
    prisma.user.count({ where: { clientId, deletedAt: null, role: { not: "REQUESTER" } } }),
    prisma.instrument.count({ where: { clientId, deletedAt: null } }),
  ]);
  const requesters = await prisma.user.count({ where: { clientId, deletedAt: null, role: "REQUESTER" } });

  return {
    plan: client?.plan ?? null,
    // Ilimitados em qualquer plano - por isso vao separados, e nao somados aos acessos.
    requesters,
    users: { current: users, limit: client?.plan?.maxUsers ?? null },
    instruments: { current: instruments, limit: client?.plan?.maxInstruments ?? null },
  };
}
