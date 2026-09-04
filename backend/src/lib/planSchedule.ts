import type { MaintenanceFrequencyUnit, OperationalCalendar } from "@prisma/client";

/**
 * Calculo do proximo vencimento de um plano de manutencao.
 *
 * Ficou num arquivo proprio porque a regra e' de verdade: periodicidade em dia/semana/mes/
 * ano, ancoragem em dia da semana / dia do mes / mes do ano, calendario operacional e datas
 * bloqueadas (feriado, parada programada). Nao da para resolver isso somando dias.
 */

export interface TimeScheduleConfig {
  frequencyUnit: MaintenanceFrequencyUnit;
  frequencyEvery: number | null;
  frequencyDays: number | null;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  monthOfYear: number | null;
  operationalCalendar: OperationalCalendar;
  blockedDates: Date[];
}

const DIA_MS = 24 * 60 * 60 * 1000;

function mesmoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function ehFimDeSemana(d: Date): boolean {
  const dia = d.getDay();
  return dia === 0 || dia === 6;
}

/** Empurra a data para frente ate cair num dia permitido pelo calendario e fora das datas
 * bloqueadas. Limite de 60 tentativas: uma parada programada longa nao trava o calculo. */
function proximoDiaPermitido(data: Date, config: Pick<TimeScheduleConfig, "operationalCalendar" | "blockedDates">): Date {
  const resultado = new Date(data);
  for (let i = 0; i < 60; i++) {
    const bloqueada = config.blockedDates.some((b) => mesmoDia(new Date(b), resultado));
    const foraDoCalendario = config.operationalCalendar === "BUSINESS_DAYS" && ehFimDeSemana(resultado);
    if (!bloqueada && !foraDoCalendario) return resultado;
    resultado.setDate(resultado.getDate() + 1);
  }
  return resultado;
}

/** Quantos dias, em media, o ciclo representa - usado no backlog e nas telas que ainda
 * pensam em dias (frequencyDays continua existindo por compatibilidade). */
export function frequencyToDays(unit: MaintenanceFrequencyUnit, every: number): number {
  switch (unit) {
    case "DAY":
      return every;
    case "WEEK":
      return every * 7;
    case "MONTH":
      return every * 30;
    case "YEAR":
      return every * 365;
  }
}

/**
 * Proximo vencimento a partir de uma data-base. Soma o ciclo na unidade certa (mes soma
 * mes, nao 30 dias), aplica a ancoragem de calendario quando informada e so entao desvia
 * de fim de semana / data bloqueada.
 */
export function computeNextDue(base: Date, config: TimeScheduleConfig): Date {
  const every = config.frequencyEvery ?? config.frequencyDays ?? 1;
  const proximo = new Date(base);

  switch (config.frequencyUnit) {
    case "DAY":
      proximo.setDate(proximo.getDate() + every);
      break;
    case "WEEK":
      proximo.setDate(proximo.getDate() + every * 7);
      if (config.dayOfWeek != null) {
        // Anda para o dia da semana pedido dentro daquela semana.
        const diff = (config.dayOfWeek - proximo.getDay() + 7) % 7;
        proximo.setDate(proximo.getDate() + diff);
      }
      break;
    case "MONTH":
      proximo.setMonth(proximo.getMonth() + every);
      if (config.dayOfMonth != null) {
        // Dia 31 em mes de 30 cai no ultimo dia do mes, nao vira o mes seguinte.
        const ultimoDia = new Date(proximo.getFullYear(), proximo.getMonth() + 1, 0).getDate();
        proximo.setDate(Math.min(config.dayOfMonth, ultimoDia));
      }
      break;
    case "YEAR":
      proximo.setFullYear(proximo.getFullYear() + every);
      if (config.monthOfYear != null) proximo.setMonth(config.monthOfYear - 1);
      if (config.dayOfMonth != null) {
        const ultimoDia = new Date(proximo.getFullYear(), proximo.getMonth() + 1, 0).getDate();
        proximo.setDate(Math.min(config.dayOfMonth, ultimoDia));
      }
      break;
  }

  return proximoDiaPermitido(proximo, config);
}

/** A partir de quando a OS ja pode ser criada (antecedencia de planejamento). */
export function computeGenerationDate(nextDue: Date, generateAdvanceDays: number | null): Date {
  if (!generateAdvanceDays) return new Date(nextDue);
  return new Date(nextDue.getTime() - generateAdvanceDays * DIA_MS);
}

export interface MeterForecast {
  /** Leitura em que o plano vence. */
  dueAtReading: number | null;
  /** Quanto falta na unidade do medidor. */
  remaining: number | null;
  /** Consumo medio por dia calculado no historico. */
  dailyAverage: number | null;
  /** Data prevista de vencimento pelo consumo medio - null quando nao da para prever. */
  forecastDate: Date | null;
}

/**
 * Previsao de vencimento por medidor. Usa o consumo medio entre a primeira e a ultima
 * leitura da janela; sem duas leituras em datas diferentes nao ha media, e a previsao
 * volta null em vez de inventar uma data.
 */
export function forecastMeterDue(
  readings: { value: number; readAt: Date }[],
  baseReading: number | null,
  interval: number | null,
  currentValue: number,
): MeterForecast {
  if (interval == null) {
    return { dueAtReading: null, remaining: null, dailyAverage: null, forecastDate: null };
  }

  const dueAtReading = (baseReading ?? 0) + interval;
  const remaining = dueAtReading - currentValue;

  const ordenadas = [...readings].sort((a, b) => new Date(a.readAt).getTime() - new Date(b.readAt).getTime());
  const primeira = ordenadas[0];
  const ultima = ordenadas[ordenadas.length - 1];

  if (!primeira || !ultima || ordenadas.length < 2) {
    return { dueAtReading, remaining, dailyAverage: null, forecastDate: null };
  }

  const dias = (new Date(ultima.readAt).getTime() - new Date(primeira.readAt).getTime()) / DIA_MS;
  const consumo = ultima.value - primeira.value;
  if (dias <= 0 || consumo <= 0) {
    return { dueAtReading, remaining, dailyAverage: null, forecastDate: null };
  }

  const dailyAverage = consumo / dias;
  const diasRestantes = remaining / dailyAverage;
  const forecastDate = new Date(Date.now() + diasRestantes * DIA_MS);

  return { dueAtReading, remaining, dailyAverage, forecastDate };
}
