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

/** Le o interruptor do cliente (cria a linha dele na primeira leitura, ligado por padrao) -
 * quem decide se quer a propria rodada automatica ligada e' o cliente, nao a OptiProcess. */
export async function getAutomationSettings(clientId: string) {
  return prisma.automationSettings.upsert({
    where: { clientId },
    create: { clientId },
    update: {},
  });
}

/** So o botao de pausa/retomar do cliente mexe aqui - "rodar agora" e a geracao
 * propriamente dita nao passam por esta funcao. */
export async function setAutomationEnabled(clientId: string, enabled: boolean, userId?: string) {
  return prisma.automationSettings.upsert({
    where: { clientId },
    create: { clientId, planGenerationEnabled: enabled, updatedById: userId },
    update: { planGenerationEnabled: enabled, updatedById: userId },
  });
}

/** O que aconteceu na ultima rodada DESTE cliente, disparada por cron ou a mao - mesma
 * tabela, para o painel dele em Planos preventivos nao ficar cego sobre rodadas manuais. */
async function registrarUltimaRodada(clientId: string, resultado: ResultadoDaRodada): Promise<void> {
  await prisma.automationSettings.upsert({
    where: { clientId },
    create: {
      clientId,
      lastRunAt: new Date(),
      lastRunGeneratedCount: resultado.gerados.length,
      lastRunIgnoredCount: resultado.ignorados.length,
      lastRunErrorCount: resultado.erros.length,
    },
    update: {
      lastRunAt: new Date(),
      lastRunGeneratedCount: resultado.gerados.length,
      lastRunIgnoredCount: resultado.ignorados.length,
      lastRunErrorCount: resultado.erros.length,
    },
  });
}

/** Um plano por tempo esta na janela de geracao quando a data de geracao ja chegou. */
function chegouAAntecedenciaPorTempo(nextDueDate: Date | null, generateAdvanceDays: number | null, agora: Date): boolean {
  if (!nextDueDate) return false;
  const geracao = computeGenerationDate(nextDueDate, generateAdvanceDays);
  return geracao != null && geracao <= agora;
}

/**
 * Gera as OS vencidas. Sem `clientId`, varre todos os clientes de uma vez (uso interno,
 * pela rodada automatica - que agora chama isto uma vez por cliente, ver mais abaixo);
 * com `clientId`, e' o "Rodar agora" de uma empresa so - e so' nesse caso a ultima rodada
 * fica registrada, porque so' ai' esta claro de quem e' a rodada.
 */
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

  if (opcoes.clientId) await registrarUltimaRodada(opcoes.clientId, resultado);
  return resultado;
}

/** Previsao de quando cada plano por medidor deve vencer - usada so para exibicao. */
export function previsaoPorMedidor(...args: Parameters<typeof forecastMeterDue>) {
  return forecastMeterDue(...args);
}

let intervalo: NodeJS.Timeout | null = null;

/**
 * Roda a geracao periodicamente dentro do proprio processo, uma empresa de cada vez -
 * pulando quem pausou a propria rodada. E' o suficiente para esta escala e nao exige
 * worker separado; como cada rodada e' idempotente, nada quebra se o servico reiniciar no
 * meio ou se alguem disparar "Rodar agora" ao mesmo tempo.
 */
export function iniciarGeracaoAutomatica(intervaloMinutos = 60): void {
  if (intervalo) return;

  const rodar = async () => {
    try {
      const clientes = await prisma.client.findMany({
        where: { deletedAt: null, contractedServices: { has: "CMMS_MAINTENANCE" } },
        select: { id: true },
      });
      if (clientes.length === 0) return;

      const configs = await prisma.automationSettings.findMany({
        where: { clientId: { in: clientes.map((c) => c.id) } },
        select: { clientId: true, planGenerationEnabled: true },
      });
      // Sem linha ainda = nunca pausou = ligado por padrao (mesma regra de getAutomationSettings).
      const pausados = new Set(configs.filter((c) => !c.planGenerationEnabled).map((c) => c.clientId));

      let totalGerados = 0;
      const numeros: string[] = [];
      for (const cliente of clientes) {
        // A pausa e' so da rodada sozinha (esta aqui). "Rodar agora" e "Gerar OS" de um
        // plano especifico continuam sendo uma decisao explicita de quem clicou, e essa
        // nunca e' bloqueada pelo interruptor do cliente.
        if (pausados.has(cliente.id)) continue;
        const r = await gerarOsVencidas({ clientId: cliente.id });
        totalGerados += r.gerados.length;
        numeros.push(...r.gerados.map((g) => g.workOrderNumber));
      }
      if (totalGerados > 0) {
        console.log(`[planos] ${totalGerados} OS gerada(s) automaticamente: ${numeros.join(", ")}`);
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
