import { prisma } from "../lib/prisma";

const PREFIXES = {
  serviceOrder: "OS",
  calibration: "CAL",
  technicalReport: "LAU",
  quote: "ORC",
  order: "PED",
} as const;

type SequenceKind = keyof typeof PREFIXES;

/** Gera um numero sequencial unico e legivel, reiniciando a cada ano (ex.: OS-2026-000123). */
export async function nextDocumentNumber(kind: SequenceKind, date: Date = new Date()): Promise<string> {
  const year = date.getFullYear();
  const counterKey = `${kind}:${year}`;

  const counter = await prisma.counter.upsert({
    where: { key: counterKey },
    create: { key: counterKey, value: 1 },
    update: { value: { increment: 1 } },
  });

  const sequence = String(counter.value).padStart(6, "0");
  return `${PREFIXES[kind]}-${year}-${sequence}`;
}

/**
 * Numeracao propria por cliente para as ordens de manutencao do CMMS ("OS-1", "OS-2"...) -
 * cada empresa comeca do 1, sem reiniciar por ano. Numeros podem se repetir entre clientes
 * diferentes (por isso a unicidade em MaintenanceWorkOrder e' [clientId, number], nao global);
 * o admin sempre ve o numero no contexto do cliente selecionado.
 */
export async function nextClientMaintenanceOrderNumber(clientId: string): Promise<string> {
  const counterKey = `maintenanceWorkOrder:${clientId}`;

  const counter = await prisma.counter.upsert({
    where: { key: counterKey },
    create: { key: counterKey, value: 1 },
    update: { value: { increment: 1 } },
  });

  return `OS-${counter.value}`;
}

/** Mesmo padrao de numeracao por cliente da OS do CMMS, so que para Solicitacao de
 * Servico ("SS-1", "SS-2"...). */
export async function nextClientServiceRequestNumber(clientId: string): Promise<string> {
  const counterKey = `serviceRequest:${clientId}`;

  const counter = await prisma.counter.upsert({
    where: { key: counterKey },
    create: { key: counterKey, value: 1 },
    update: { value: { increment: 1 } },
  });

  return `SS-${counter.value}`;
}
