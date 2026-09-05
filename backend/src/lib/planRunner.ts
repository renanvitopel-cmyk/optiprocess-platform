import { prisma } from "./prisma";
import { computeGenerationDate, forecastMeterDue } from "./planSchedule";
import { criarOsDoPlanoParaAutomacao } from "../modules/maintenancePlans/controller";

/**
 * Disparo automatico dos planos preventivos.
 *
 * A OS precisa nascer ANTES do vencimento para dar tempo de planejar: reservar peca,
 * combinar a parada, escalar a equipe. Quem decide esse "antes" e' a antecedencia
 * configurada em cada plano (em dias, ou em unidades do medidor). Ate aqui a geracao
 * dependia de alguem lembrar de clicar - o que, na pratica, so acontece depois de vencer.
 *
 * A rodada e' idempotente: `criarOsDoPlano` recusa gerar uma segunda OS para o mesmo
 * ciclo, entao rodar de novo (ou duas instancias rodando juntas) nao duplica nada.
 */

export interface ResultadoDaRodada {
  avaliados: number;
  gerados: { planId: string; code: string | null; workOrderNumber: string }[];
  ignorados: { planId: string; code: string | null; motivo: string }[];
  erros: { planId: string; code: string | null; erro: string }[];
}

/** Um plano por tempo esta na janela de geracao quando a data de geracao ja chegou. */
function chegouAAntecedenciaPorTempo(nextDueDate: Date | null, generateAdvanceDays: number | null, agora: Date): boolean {
  if (!nextDueDate) return false;
  const geracao = computeGenerationDate(nextDueDate, generateAdvanceDays);
  return geracao != null && geracao <= agora;
}

export async function gerarOsVencidas(opcoes: { clientId?: string; userId?: string } = {}): Promise<ResultadoDaRodada> {
  const agora = new Date();

  const planos = await prisma.maintenancePlan.findMany({
    where: {
      deletedAt: null,
      status: "ACTIVE",
      ...(opcoes.clientId ? { clientId: opcoes.clientId } : {}),
    },
    select: {
      id: true,
      code: true,
      name: true,
      triggerType: true,
      nextDueDate: true,
      generateAdvanceDays: true,
      generateAdvanceMeterUnits: true,
      meterInterval: true,
      meterBaseReading: true,
      lastMeterAtGeneration: true,
      meter: { select: { id: true, currentValue: true } },
    },
  });

  const resultado: ResultadoDaRodada = { avaliados: planos.length, gerados: [], ignorados: [], erros: [] };

  for (const plano of planos) {
    let naJanela = false;

    if (plano.triggerType === "TIME") {
      naJanela = chegouAAntecedenciaPorTempo(plano.nextDueDate, plano.generateAdvanceDays, agora);
    } else if (plano.triggerType === "METER" && plano.meter && plano.meterInterval) {
      // Por medidor a antecedencia e' em unidades: gera quando faltam N unidades para o
      // proximo vencimento (ex.: 200 h antes das 5.000 h do horimetro).
      const base = plano.lastMeterAtGeneration ?? plano.meterBaseReading ?? 0;
      const proximaLeitura = base + plano.meterInterval;
      const antecedencia = plano.generateAdvanceMeterUnits ?? 0;
      naJanela = plano.meter.currentValue >= proximaLeitura - antecedencia;
    } else {
      // CONDITION: a OS nasce da leitura do medidor fora da faixa, nao do calendario.
      resultado.ignorados.push({ planId: plano.id, code: plano.code, motivo: "Plano por condicao - a OS nasce da leitura fora da faixa." });
      continue;
    }

    if (!naJanela) {
      resultado.ignorados.push({ planId: plano.id, code: plano.code, motivo: "Ainda nao chegou a antecedencia configurada." });
      continue;
    }

    try {
      const os = await criarOsDoPlanoParaAutomacao(plano.id, { userId: opcoes.userId });
      resultado.gerados.push({ planId: plano.id, code: plano.code, workOrderNumber: os.number });
    } catch (erro) {
      // Um plano que nao pode gerar (sem material obrigatorio, OS do ciclo ainda aberta)
      // nao pode derrubar a rodada dos outros - o motivo fica registrado e a rodada segue.
      const mensagem = erro instanceof Error ? erro.message : String(erro);
      resultado.ignorados.push({ planId: plano.id, code: plano.code, motivo: mensagem });
    }
  }

  return resultado;
}

/** Previsao de quando cada plano por medidor deve vencer - usada so para exibicao. */
export function previsaoPorMedidor(...args: Parameters<typeof forecastMeterDue>) {
  return forecastMeterDue(...args);
}

let intervalo: NodeJS.Timeout | null = null;

/**
 * Roda a geracao periodicamente dentro do proprio processo. E' o suficiente para esta
 * escala e nao exige worker separado; como a rodada e' idempotente, nada quebra se o
 * servico reiniciar no meio ou se alguem disparar a rodada manualmente ao mesmo tempo.
 */
export function iniciarGeracaoAutomatica(intervaloMinutos = 60): void {
  if (intervalo) return;

  const rodar = async () => {
    try {
      const r = await gerarOsVencidas();
      if (r.gerados.length > 0) {
        console.log(`[planos] ${r.gerados.length} OS gerada(s) automaticamente: ${r.gerados.map((g) => g.workOrderNumber).join(", ")}`);
      }
    } catch (erro) {
      console.error("[planos] falha na rodada de geracao automatica:", erro);
    }
  };

  // Uma passada logo apos subir: se o servico ficou fora do ar, os planos que venceram
  // nesse periodo entram assim que ele volta.
  void rodar();
  intervalo = setInterval(rodar, intervaloMinutos * 60 * 1000);
  // Nao segura o processo aberto no encerramento.
  intervalo.unref?.();
}
