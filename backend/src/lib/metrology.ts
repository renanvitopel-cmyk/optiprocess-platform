/**
 * Calculos metrologicos de um ponto de calibracao: tolerancia a partir do criterio de
 * aceitacao do ativo, incerteza expandida pelo GUM (padrao + resolucao + repetibilidade)
 * e o resultado pela regra de decisao.
 *
 * Funcoes puras, sem banco. O frontend tem uma copia identica em
 * frontend/src/lib/metrology.ts para mostrar os valores enquanto o tecnico digita - o
 * backend recalcula ao salvar e e' o valor dele que vale.
 */

export type ToleranceModeValue = "PERCENT_FULL_SCALE" | "PERCENT_READING" | "ABSOLUTE";
export type UncertaintyModeValue = "ABSOLUTE" | "PERCENT_READING";
export type DecisionRuleValue = "SIMPLE" | "GUARD_BAND";

export interface ToleranceCriterion {
  toleranceMode?: ToleranceModeValue | null;
  toleranceValue?: number | null;
  rangeMin?: number | null;
  rangeMax?: number | null;
}

export interface StandardUncertainty {
  expandedUncertainty?: number | null;
  uncertaintyMode?: UncertaintyModeValue | null;
  uncertaintyK?: number | null;
}

export interface UncertaintyBudget {
  uStandard: number;
  uResolution: number;
  uRepeatability: number;
  uCombined: number;
  expanded: number;
}

/** Media, erro (media - padrao) e desvio padrao amostral (n-1) das leituras. */
export function readingStats(readings: number[], standardValue: number | null | undefined) {
  const n = readings.length;
  const mean = n > 0 ? readings.reduce((a, b) => a + b, 0) / n : null;
  const error = mean != null && standardValue != null ? mean - standardValue : null;
  let deviation: number | null = null;
  if (n > 1 && mean != null) {
    deviation = Math.sqrt(readings.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n - 1));
  }
  return { n, mean, error, deviation };
}

/**
 * Erro maximo admissivel no ponto. Um % cadastrado no proprio ponto do ativo (ex.: um
 * PT-100 de uma extrusora) tem precedencia sobre o criterio geral do ativo.
 * Devolve null quando nao da' para calcular - ai a tolerancia volta a ser digitada.
 */
export function pointTolerance(
  criterion: ToleranceCriterion | null | undefined,
  standardValue: number | null | undefined,
  registeredPointPercent?: number | null,
): number | null {
  if (registeredPointPercent != null && standardValue != null) {
    return Math.abs(standardValue) * (registeredPointPercent / 100);
  }
  if (!criterion?.toleranceMode || criterion.toleranceValue == null) return null;
  const value = criterion.toleranceValue;
  switch (criterion.toleranceMode) {
    case "ABSOLUTE":
      return Math.abs(value);
    case "PERCENT_READING":
      return standardValue == null ? null : Math.abs(standardValue) * (value / 100);
    case "PERCENT_FULL_SCALE": {
      // Fundo de escala = amplitude da faixa (max - min); sem o maximo nao ha base.
      if (criterion.rangeMax == null) return null;
      const span = Math.abs(criterion.rangeMax - (criterion.rangeMin ?? 0));
      return span * (value / 100);
    }
    default:
      return null;
  }
}

/** Incerteza-padrao (k=1) de um padrao no ponto: U do certificado / k do certificado. */
function standardPartial(s: StandardUncertainty, standardValue: number | null | undefined): number | null {
  if (s.expandedUncertainty == null) return null;
  const k = s.uncertaintyK && s.uncertaintyK > 0 ? s.uncertaintyK : 2;
  if (s.uncertaintyMode === "PERCENT_READING") {
    if (standardValue == null) return null;
    return (Math.abs(standardValue) * (s.expandedUncertainty / 100)) / k;
  }
  return Math.abs(s.expandedUncertainty) / k;
}

/**
 * Orcamento de incerteza simplificado (GUM), com as tres parcelas usuais de bancada:
 * - padrao: incerteza do certificado do(s) padrao(es), combinada em raiz da soma dos quadrados;
 * - resolucao do instrumento: distribuicao retangular, res / (2*raiz(3));
 * - repetibilidade: desvio padrao das leituras / raiz(n).
 * Sem incerteza de nenhum padrao nao ha base para calcular: devolve null.
 */
export function uncertaintyBudget(input: {
  standards: StandardUncertainty[];
  standardValue: number | null | undefined;
  resolution?: number | null;
  deviation: number | null;
  n: number;
  k?: number | null;
}): UncertaintyBudget | null {
  const partials = input.standards
    .map((s) => standardPartial(s, input.standardValue))
    .filter((u): u is number => u != null);
  if (partials.length === 0) return null;

  const uStandard = Math.sqrt(partials.reduce((acc, u) => acc + u ** 2, 0));
  const uResolution = input.resolution && input.resolution > 0 ? input.resolution / (2 * Math.sqrt(3)) : 0;
  const uRepeatability = input.deviation != null && input.n > 1 ? input.deviation / Math.sqrt(input.n) : 0;
  const uCombined = Math.sqrt(uStandard ** 2 + uResolution ** 2 + uRepeatability ** 2);
  const k = input.k && input.k > 0 ? input.k : 2;
  return { uStandard, uResolution, uRepeatability, uCombined, expanded: k * uCombined };
}

/** Aprovado/reprovado pela regra de decisao da calibracao. */
export function pointResult(
  error: number | null,
  tolerance: number | null,
  expandedUncertainty: number | null,
  rule: DecisionRuleValue = "SIMPLE",
): "PASS" | "FAIL" | null {
  if (error == null || tolerance == null) return null;
  const margin = rule === "GUARD_BAND" ? Math.abs(error) + (expandedUncertainty ?? 0) : Math.abs(error);
  // Tolerancia de ponto flutuante: 0,1 + 0,2 nao pode reprovar um ponto exatamente no limite.
  return margin <= tolerance + 1e-9 ? "PASS" : "FAIL";
}

/** Arredonda para gravar sem ruido de ponto flutuante (0.30000000000000004). */
export function round(v: number, digits = 6): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

/** Pontos sugeridos distribuidos igualmente na faixa (ex.: 5 pontos = 0/25/50/75/100%). */
export function suggestedPoints(rangeMin: number, rangeMax: number, count: number): number[] {
  if (count < 2) return [rangeMax];
  const step = (rangeMax - rangeMin) / (count - 1);
  return Array.from({ length: count }, (_, i) => round(rangeMin + step * i, 6));
}
