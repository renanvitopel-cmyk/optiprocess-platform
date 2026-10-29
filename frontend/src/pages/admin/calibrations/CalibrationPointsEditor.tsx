import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Plus, Trash2, Wand2 } from "lucide-react";
import type { Instrument, InstrumentCalibrationPoint } from "../../../api/types";
import { parseDecimal } from "../../../components/form/UncertaintyFields";
import { useToast } from "../../../components/Toast";
import {
  pointResult,
  pointTolerance,
  readingStats,
  suggestedPoints,
  uncertaintyBudget,
  type StandardUncertainty,
  type UncertaintyBudget,
} from "../../../lib/metrology";
import type { FormValues } from "./CalibrationFieldsForm";

export const EMPTY_POINT = {
  label: "",
  sensorTypeName: "",
  instrumentCalibrationPointId: "",
  performed: true,
  notes: "",
  standardValue: "",
  readings: ["", "", ""],
  tolerance: "",
  uncertainty: "",
};

/** O que o formulario precisa saber dos pontos para sugerir o resultado final. */
export interface ResumoDosPontos {
  /** Todos os pontos realizados ja tem resultado (padrao e leituras preenchidos). */
  completo: boolean;
  aprovados: number;
  reprovados: number;
  naoRealizados: number;
}

interface Props {
  /** Ficha do ativo - traz o criterio de aceitacao, a faixa e a resolucao numerica. */
  instrument?: Instrument;
  registeredPoints?: InstrumentCalibrationPoint[];
  /** Ativo do rascunho salvo: os pontos dele nao sao trocados pelos pre-cadastrados. */
  savedInstrumentId: string | null;
  onResumo: (resumo: ResumoDosPontos) => void;
}

const QUANTIDADES_DE_PONTOS = [3, 5, 6, 10, 11];

function fmt(v: number | null | undefined, digits = 4): string {
  if (v == null || !Number.isFinite(v)) return "-";
  return v.toLocaleString("pt-BR", { maximumFractionDigits: digits });
}
function paraTexto(v: number): string {
  return String(v).replace(".", ",");
}

const MODO_DA_TOLERANCIA: Record<string, string> = {
  PERCENT_FULL_SCALE: "% do fundo de escala",
  PERCENT_READING: "% do valor medido",
  ABSOLUTE: "valor fixo",
};

interface CalculoDoPonto {
  media: number | null;
  erro: number | null;
  tolerancia: number | null;
  toleranciaAutomatica: boolean;
  incerteza: number | null;
  orcamento: UncertaintyBudget | null;
  resultado: "PASS" | "FAIL" | null;
}

/**
 * Tabela de pontos da calibracao. O tecnico digita so' o que mede - valor do padrao e
 * leituras; media, erro, tolerancia (pelo criterio do ativo), incerteza expandida (GUM) e
 * resultado aparecem calculados na linha. Quando falta cadastro para calcular (ativo sem
 * criterio, padrao sem incerteza), o campo correspondente volta a ser digitavel, com um
 * aviso dizendo o que cadastrar. O servidor refaz as mesmas contas ao salvar.
 */
export function CalibrationPointsEditor({ instrument, registeredPoints, savedInstrumentId, onResumo }: Props) {
  const { notify } = useToast();
  const {
    control,
    register,
    setValue,
    getValues,
    formState: { errors },
  } = useFormContext<FormValues>();
  const { fields, append, remove, replace } = useFieldArray({ control, name: "points" });

  const points = useWatch({ control, name: "points" });
  const standards = useWatch({ control, name: "standards" });
  const kTexto = useWatch({ control, name: "coverageFactorK" });
  const decisionRule = useWatch({ control, name: "decisionRule" });
  const instrumentId = useWatch({ control, name: "instrumentId" });

  // Ativo com pontos pre-cadastrados (ex.: os 10 PT-100 de uma extrusora): a tabela abre
  // com uma linha por ponto - so' quando o ativo muda de fato, para nao apagar o que o
  // tecnico ja preencheu. Num rascunho, os pontos salvos contam como ja aplicados.
  const lastAppliedInstrumentId = useRef<string | null>(savedInstrumentId);
  useEffect(() => {
    if (!instrumentId || registeredPoints === undefined) return;
    if (lastAppliedInstrumentId.current === instrumentId) return;
    lastAppliedInstrumentId.current = instrumentId;
    if (registeredPoints.length > 0) {
      const n = getValues("points")[0]?.readings.length ?? 3;
      replace(
        registeredPoints.map((p) => ({
          ...EMPTY_POINT,
          label: p.label,
          sensorTypeName: p.sensorType?.name ?? "",
          instrumentCalibrationPointId: p.id,
          readings: Array(n).fill(""),
        })),
      );
    }
  }, [instrumentId, registeredPoints, replace, getValues]);

  const padroesComIncerteza: StandardUncertainty[] = useMemo(
    () =>
      (standards ?? [])
        .map((s) => ({
          expandedUncertainty: parseDecimal(s.expandedUncertainty),
          uncertaintyMode: s.uncertaintyMode ?? "ABSOLUTE",
          uncertaintyK: parseDecimal(s.uncertaintyK),
        }))
        .filter((s) => s.expandedUncertainty != null),
    [standards],
  );
  const incertezaAutomatica = padroesComIncerteza.length > 0;
  const k = Number(kTexto) > 0 ? Number(kTexto) : 2;
  const temCriterio = !!instrument?.toleranceMode && instrument.toleranceValue != null;
  const percentualDoPontoCadastrado = (id?: string) =>
    id ? registeredPoints?.find((rp) => rp.id === id)?.tolerancePercent ?? null : null;

  const calculos: (CalculoDoPonto | null)[] = (points ?? []).map((p) => {
    if (!p.performed) return null;
    const padrao = parseDecimal(p.standardValue);
    const leituras = p.readings.map((r) => parseDecimal(r));
    const completas = leituras.every((r) => r != null) && leituras.length >= 3;
    const stats = readingStats(leituras.filter((r): r is number => r != null), padrao);
    const toleranciaAuto = pointTolerance(instrument, padrao, percentualDoPontoCadastrado(p.instrumentCalibrationPointId));
    const tolerancia = toleranciaAuto ?? parseDecimal(p.tolerance);
    const orcamento =
      completas && padrao != null
        ? uncertaintyBudget({
            standards: padroesComIncerteza,
            standardValue: padrao,
            resolution: instrument?.resolutionValue,
            deviation: stats.deviation,
            n: stats.n,
            k,
          })
        : null;
    const incerteza = orcamento?.expanded ?? (incertezaAutomatica ? null : parseDecimal(p.uncertainty));
    return {
      media: stats.mean,
      erro: completas ? stats.error : null,
      tolerancia,
      toleranciaAutomatica: toleranciaAuto != null,
      incerteza,
      orcamento,
      resultado: completas ? pointResult(stats.error, tolerancia, incerteza, decisionRule ?? "SIMPLE") : null,
    };
  });

  // Resumo para o resultado final sugerido - so' avisa quando muda de verdade.
  const resumo: ResumoDosPontos = {
    completo: calculos.every((c, i) => !points?.[i]?.performed || c?.resultado != null),
    aprovados: calculos.filter((c) => c?.resultado === "PASS").length,
    reprovados: calculos.filter((c) => c?.resultado === "FAIL").length,
    naoRealizados: (points ?? []).filter((p) => !p.performed).length,
  };
  const chaveDoResumo = JSON.stringify(resumo);
  useEffect(() => {
    onResumo(JSON.parse(chaveDoResumo) as ResumoDosPontos);
  }, [chaveDoResumo, onResumo]);

  // ---- leituras por ponto (uma vez para a calibracao inteira) ----
  const nLeituras = Math.max(3, ...(points ?? []).map((p) => p.readings.length));
  function mudarNumeroDeLeituras(n: number) {
    const atuais = getValues("points");
    const perderiaDado = atuais.some((p) => p.readings.slice(n).some((r) => r.trim() !== ""));
    if (perderiaDado) {
      notify("error", `Há leituras preenchidas além da ${n}ª. Apague-as antes de reduzir a quantidade.`);
      return;
    }
    atuais.forEach((p, i) => {
      const novas = p.readings.slice(0, n);
      while (novas.length < n) novas.push("");
      setValue(`points.${i}.readings`, novas, { shouldDirty: true });
    });
  }

  // ---- gerar pontos pela faixa do ativo ----
  const [quantidadeParaGerar, setQuantidadeParaGerar] = useState(5);
  const [confirmandoGeracao, setConfirmandoGeracao] = useState(false);
  const podeGerar = instrument?.rangeMax != null && !(registeredPoints && registeredPoints.length > 0);
  const temDadosPreenchidos = (points ?? []).some((p) => (p.standardValue ?? "").trim() !== "" || p.readings.some((r) => r.trim() !== ""));
  function gerarPontos(confirmado = false) {
    const max = instrument?.rangeMax;
    if (max == null) return;
    if (temDadosPreenchidos && !confirmado) {
      setConfirmandoGeracao(true);
      return;
    }
    setConfirmandoGeracao(false);
    const valores = suggestedPoints(instrument?.rangeMin ?? 0, max, quantidadeParaGerar);
    replace(valores.map((v) => ({ ...EMPTY_POINT, standardValue: paraTexto(v), readings: Array(nLeituras).fill("") })));
  }

  const [abertos, setAbertos] = useState<Set<number>>(new Set());
  const alternar = (i: number) =>
    setAbertos((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  const mostrarRotulo = (points ?? []).some((p) => p.label || p.instrumentCalibrationPointId);
  const precisaToleranciaDigitada = (i: number) => !!points?.[i]?.performed && calculos[i] != null && !calculos[i]!.toleranciaAutomatica;
  const unidade = instrument?.unit ? ` (${instrument.unit})` : "";
  const colunasDeDados = 1 + nLeituras + 3; // padrao, leituras, media/erro, tol/U, resultado
  const erroDoPonto = (i: number) => errors.points?.[i];
  const celula = "input h-9 w-16 px-2 text-right tabular-nums";

  return (
    <div className="card space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-navy-900">Pontos calibrados</h2>
          <p className="mt-1 text-xs text-graphite-500">
            Digite o valor do padrão e as leituras. Média, erro, tolerância, incerteza e resultado são calculados.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-graphite-600">
            Leituras por ponto
            <select
              className="input h-8 w-16 py-0 text-xs"
              value={nLeituras}
              onChange={(e) => mudarNumeroDeLeituras(Number(e.target.value))}
            >
              {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          {podeGerar && (
            <span className="flex items-center gap-1.5">
              <select
                className="input h-8 w-[7.5rem] py-0 text-xs"
                value={quantidadeParaGerar}
                onChange={(e) => {
                  setQuantidadeParaGerar(Number(e.target.value));
                  setConfirmandoGeracao(false);
                }}
                aria-label="Quantidade de pontos a gerar"
              >
                {QUANTIDADES_DE_PONTOS.map((n) => (
                  <option key={n} value={n}>{n} pontos</option>
                ))}
              </select>
              <button type="button" className="btn-outline btn-sm" onClick={() => gerarPontos()}>
                <Wand2 className="h-4 w-4" /> Gerar pela faixa
              </button>
            </span>
          )}
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => append({ ...EMPTY_POINT, readings: Array(nLeituras).fill("") })}
          >
            <Plus className="h-4 w-4" /> Adicionar ponto
          </button>
        </div>
      </div>

      {confirmandoGeracao && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-safety-yellow/40 bg-safety-yellow/10 px-4 py-2.5 text-sm text-graphite-700">
          <span>Substituir os {fields.length} pontos atuais por {quantidadeParaGerar} pontos de {fmt(instrument?.rangeMin ?? 0)} a {fmt(instrument?.rangeMax)}? O que foi digitado será perdido.</span>
          <span className="flex gap-2">
            <button type="button" className="btn-outline btn-sm" onClick={() => setConfirmandoGeracao(false)}>Cancelar</button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => gerarPontos(true)}>Substituir</button>
          </span>
        </div>
      )}

      {/* O que o sistema esta calculando sozinho, e o que falta cadastrar para calcular. */}
      <div className="grid gap-2 text-xs sm:grid-cols-2">
        <StatusDoCalculo
          ok={temCriterio || (registeredPoints ?? []).some((p) => p.tolerancePercent != null)}
          titulo="Tolerância"
          okTexto={
            temCriterio
              ? `${fmt(instrument!.toleranceValue)}${instrument!.toleranceMode === "ABSOLUTE" ? `${unidade || ""} (valor fixo)` : ` ${MODO_DA_TOLERANCIA[instrument!.toleranceMode!]}`}${
                  instrument!.toleranceMode === "PERCENT_FULL_SCALE" && instrument!.rangeMax != null
                    ? ` - faixa ${fmt(instrument!.rangeMin ?? 0)} a ${fmt(instrument!.rangeMax)}`
                    : ""
                }${instrument!.accuracyClass ? ` · classe ${instrument!.accuracyClass}` : ""}`
              : "pelo % cadastrado em cada ponto do ativo"
          }
          faltaTexto="Ativo sem critério de aceitação: digite a tolerância de cada ponto, ou cadastre o critério na ficha do ativo (Calibração)."
        />
        <StatusDoCalculo
          ok={incertezaAutomatica}
          titulo="Incerteza"
          okTexto={`calculada pelo GUM: padrão + resolução${instrument?.resolutionValue ? ` (${fmt(instrument.resolutionValue)})` : " (não cadastrada)"} + repetibilidade, k = ${fmt(k, 2)}`}
          faltaTexto="Nenhum padrão com incerteza informada: digite a incerteza de cada ponto, ou informe a incerteza (U) do certificado do padrão acima."
        />
      </div>

      {errors.points?.message && <p className="field-error">{errors.points.message}</p>}

      <div className="table-shell">
        {/* Celulas mais justas que o padrao das tabelas: com 3 leituras a linha inteira
            cabe na tela sem rolagem lateral. */}
        <table className="table-base [&_td]:px-2 [&_th]:px-2">
          <thead>
            <tr>
              <th className="w-8">#</th>
              {mostrarRotulo && <th>Ponto</th>}
              <th className="text-right leading-tight">
                Padrão
                {unidade && (
                  <>
                    <br />
                    <span className="font-normal normal-case">{unidade.trim()}</span>
                  </>
                )}
              </th>
              {Array.from({ length: nLeituras }, (_, i) => (
                <th key={i} className="text-right">L{i + 1}</th>
              ))}
              {/* Pares numa coluna so' (um embaixo do outro): a ficha do rascunho tem pouco
                  mais de 600px para a tabela e assim a linha cabe sem rolagem lateral. */}
              <th className="text-right leading-tight">Média<br /><span className="font-normal normal-case">erro</span></th>
              <th className="text-right leading-tight">Tol. ±<br /><span className="font-normal normal-case">incert. U</span></th>
              <th className="text-center">Resultado</th>
              <th className="w-12" />
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => {
              const p = points?.[index];
              const c = calculos[index];
              const realizado = !!p?.performed;
              const aberto = abertos.has(index);
              return (
                <Fragment key={field.id}>
                  <tr>
                    <td>
                      <input type="hidden" {...register(`points.${index}.instrumentCalibrationPointId`)} />
                      <input type="hidden" {...register(`points.${index}.sensorTypeName`)} />
                      <label className="flex items-center gap-1 text-xs font-semibold text-graphite-500" title="Ponto realizado">
                        <input type="checkbox" className="h-4 w-4" {...register(`points.${index}.performed`)} />
                        {index + 1}
                      </label>
                    </td>
                    {mostrarRotulo && (
                      <td>
                        <input className="input h-9 min-w-[9rem]" placeholder="Ex.: PT-100 Zona 1" {...register(`points.${index}.label`)} />
                      </td>
                    )}
                    {realizado ? (
                      <>
                        <td className="text-right">
                          <input
                            className={`${celula} ${erroDoPonto(index)?.standardValue ? "input-error" : ""}`}
                            inputMode="decimal"
                            aria-label={`Valor padrão do ponto ${index + 1}`}
                            {...register(`points.${index}.standardValue`)}
                          />
                        </td>
                        {Array.from({ length: nLeituras }, (_, li) => (
                          <td key={li} className="text-right">
                            <input
                              className={`${celula} ${erroDoPonto(index)?.readings?.[li] ? "input-error" : ""}`}
                              inputMode="decimal"
                              aria-label={`Leitura ${li + 1} do ponto ${index + 1}`}
                              {...register(`points.${index}.readings.${li}`)}
                            />
                          </td>
                        ))}
                        <td className="text-right tabular-nums leading-tight">
                          <span className="block text-graphite-800">{fmt(c?.media)}</span>
                          <span className="block text-xs text-graphite-500">{fmt(c?.erro)}</span>
                        </td>
                        <td className="text-right tabular-nums leading-tight">
                          <div className="flex flex-col items-end gap-1">
                            {precisaToleranciaDigitada(index) ? (
                              <input className={celula} inputMode="decimal" placeholder="tol." aria-label={`Tolerância do ponto ${index + 1}`} {...register(`points.${index}.tolerance`)} />
                            ) : (
                              <span className="text-graphite-800">{fmt(c?.tolerancia)}</span>
                            )}
                            {!incertezaAutomatica ? (
                              <input className={celula} inputMode="decimal" placeholder="U" aria-label={`Incerteza do ponto ${index + 1}`} {...register(`points.${index}.uncertainty`)} />
                            ) : (
                              <span className="text-xs text-graphite-500">{fmt(c?.incerteza)}</span>
                            )}
                          </div>
                        </td>
                        <td className="text-center">
                          <SeloDoResultado resultado={c?.resultado ?? null} />
                        </td>
                      </>
                    ) : (
                      <td colSpan={colunasDeDados}>
                        <input
                          className={`input h-9 ${erroDoPonto(index)?.notes ? "input-error" : ""}`}
                          placeholder="Por que este ponto não foi calibrado (ex.: sensor quebrado, sem acesso)"
                          {...register(`points.${index}.notes`)}
                        />
                        {erroDoPonto(index)?.notes?.message && <p className="field-error">{erroDoPonto(index)?.notes?.message}</p>}
                      </td>
                    )}
                    <td>
                      <div className="flex items-center justify-end gap-1.5">
                        {realizado && (
                          <button
                            type="button"
                            onClick={() => alternar(index)}
                            className="text-graphite-400 hover:text-navy-700"
                            aria-label={aberto ? "Esconder memória de cálculo" : "Ver memória de cálculo"}
                            title="Memória de cálculo"
                          >
                            {aberto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        )}
                        {fields.length > 1 && (
                          <button type="button" onClick={() => remove(index)} className="text-graphite-400 hover:text-safety-red" aria-label={`Remover ponto ${index + 1}`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {realizado && aberto && (
                    <tr className="bg-navy-50/40">
                      <td />
                      <td colSpan={(mostrarRotulo ? 1 : 0) + colunasDeDados + 1}>
                        <MemoriaDeCalculo calculo={c} k={k} incertezaAutomatica={incertezaAutomatica} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusDoCalculo({ ok, titulo, okTexto, faltaTexto }: { ok: boolean; titulo: string; okTexto: string; faltaTexto: string }) {
  return ok ? (
    <p className="flex items-start gap-2 rounded-lg bg-safety-green/10 px-3 py-2 text-graphite-700">
      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-safety-green-dark" />
      <span>
        <strong className="text-navy-900">{titulo} automática:</strong> {okTexto}
      </span>
    </p>
  ) : (
    <p className="flex items-start gap-2 rounded-lg bg-safety-yellow/10 px-3 py-2 text-graphite-700">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-safety-yellow-dark" />
      <span>{faltaTexto}</span>
    </p>
  );
}

function SeloDoResultado({ resultado }: { resultado: "PASS" | "FAIL" | null }) {
  if (resultado === "PASS") {
    return <span className="inline-flex rounded-full bg-safety-green/15 px-2 py-0.5 text-[11px] font-semibold text-safety-green-dark">Aprovado</span>;
  }
  if (resultado === "FAIL") {
    return <span className="inline-flex rounded-full bg-safety-red/10 px-2 py-0.5 text-[11px] font-semibold text-safety-red">Reprovado</span>;
  }
  return <span className="text-xs text-graphite-400">-</span>;
}

/** Orcamento de incerteza do ponto - de onde saiu o U, parcela por parcela. */
function MemoriaDeCalculo({ calculo, k, incertezaAutomatica }: { calculo: CalculoDoPonto | null; k: number; incertezaAutomatica: boolean }) {
  if (!calculo) return null;
  const o = calculo.orcamento;
  return (
    <div className="grid gap-x-6 gap-y-1 py-1 text-xs text-graphite-600 sm:grid-cols-3">
      <p>
        <span className="text-graphite-400">Tolerância:</span>{" "}
        {calculo.toleranciaAutomatica ? "pelo critério do ativo" : "digitada"} = ± {fmt(calculo.tolerancia)}
      </p>
      {o ? (
        <>
          <p><span className="text-graphite-400">u padrão</span> (U/k do certificado) = {fmt(o.uStandard, 5)}</p>
          <p><span className="text-graphite-400">u resolução</span> (res / 2√3) = {fmt(o.uResolution, 5)}</p>
          <p><span className="text-graphite-400">u repetibilidade</span> (s / √n) = {fmt(o.uRepeatability, 5)}</p>
          <p><span className="text-graphite-400">u combinada</span> (√Σu²) = {fmt(o.uCombined, 5)}</p>
          <p className="font-semibold text-navy-900">U = k × uc = {fmt(k, 2)} × {fmt(o.uCombined, 5)} = {fmt(o.expanded, 5)}</p>
        </>
      ) : (
        <p className="sm:col-span-2">
          {incertezaAutomatica ? "Preencha o valor padrão e todas as leituras para calcular a incerteza." : "Incerteza digitada (sem incerteza de padrão cadastrada)."}
        </p>
      )}
    </div>
  );
}
