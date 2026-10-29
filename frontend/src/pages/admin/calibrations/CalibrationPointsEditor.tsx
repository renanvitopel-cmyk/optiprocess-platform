import { useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Calculator, CheckCircle2, Pencil, Plus, Trash2, Wand2 } from "lucide-react";
import type { Instrument, InstrumentCalibrationPoint, ToleranceMode } from "../../../api/types";
import { updateInstrument } from "../../../api/instruments";
import { getApiErrorMessage } from "../../../api/client";
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
function fmtComSinal(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "-";
  return `${v > 0 ? "+" : ""}${fmt(v)}`;
}
function paraTexto(v: number | null | undefined): string {
  return v == null ? "" : String(v).replace(".", ",");
}

const MODO_DA_TOLERANCIA: Record<ToleranceMode, string> = {
  PERCENT_FULL_SCALE: "% do fundo de escala",
  PERCENT_READING: "% do valor medido",
  ABSOLUTE: "valor fixo (±)",
};

interface CalculoDoPonto {
  media: number | null;
  erro: number | null;
  tolerancia: number | null;
  incerteza: number | null;
  orcamento: UncertaintyBudget | null;
  resultado: "PASS" | "FAIL" | null;
}

/**
 * Pontos da calibracao, um cartao por ponto. O tecnico digita so' o que mede - valor do
 * padrao e leituras; media, erro, tolerancia (pelo criterio do ativo), incerteza expandida
 * (GUM) e resultado aparecem calculados no proprio cartao. O que faltar de cadastro para
 * calcular (criterio do ativo, incerteza do padrao) e' resolvido no painel do topo, sem
 * sair da tela. O servidor refaz as mesmas contas ao salvar.
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

  const pontoCadastrado = (id?: string) => (id ? registeredPoints?.find((rp) => rp.id === id) : undefined);

  // Ativo com pontos pre-cadastrados (ex.: os 10 PT-100 de uma extrusora): abre com um
  // cartao por ponto, ja com o valor nominal ("alvo") do cadastro como valor do padrao -
  // so' quando o ativo muda de fato, para nao apagar o que o tecnico ja preencheu.
  const lastAppliedInstrumentId = useRef<string | null>(savedInstrumentId);
  useEffect(() => {
    if (!instrumentId || registeredPoints === undefined) return;
    if (lastAppliedInstrumentId.current === instrumentId) {
      // Rascunho ja salvo: completa so' o padrao que ficou em branco nos pontos cadastrados.
      getValues("points").forEach((p, i) => {
        const alvo = pontoCadastrado(p.instrumentCalibrationPointId)?.targetTemperature;
        if (!(p.standardValue ?? "").trim() && alvo != null) setValue(`points.${i}.standardValue`, paraTexto(alvo));
      });
      return;
    }
    lastAppliedInstrumentId.current = instrumentId;
    if (registeredPoints.length > 0) {
      const n = getValues("points")[0]?.readings.length ?? 3;
      replace(
        registeredPoints.map((p) => ({
          ...EMPTY_POINT,
          label: p.label,
          sensorTypeName: p.sensorType?.name ?? "",
          instrumentCalibrationPointId: p.id,
          standardValue: paraTexto(p.targetTemperature),
          readings: Array(n).fill(""),
        })),
      );
    }
    // pontoCadastrado le registeredPoints, que ja esta nas dependencias
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instrumentId, registeredPoints, replace, getValues, setValue]);

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
  const toleranciaPorPonto = (points ?? []).some((p) => pontoCadastrado(p.instrumentCalibrationPointId)?.tolerancePercent != null);

  const calculos: (CalculoDoPonto | null)[] = (points ?? []).map((p) => {
    if (!p.performed) return null;
    const padrao = parseDecimal(p.standardValue);
    const leituras = p.readings.map((r) => parseDecimal(r));
    const completas = leituras.every((r) => r != null) && leituras.length >= 3;
    const stats = readingStats(leituras.filter((r): r is number => r != null), padrao);
    const tolerancia =
      pointTolerance(instrument, padrao, pontoCadastrado(p.instrumentCalibrationPointId)?.tolerancePercent) ??
      parseDecimal(p.tolerance);
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
      media: stats.n > 0 ? stats.mean : null,
      erro: completas ? stats.error : null,
      tolerancia,
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
  const temDadosPreenchidos = (points ?? []).some(
    (p) => (p.standardValue ?? "").trim() !== "" || p.readings.some((r) => r.trim() !== ""),
  );
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

  const erroDoPonto = (i: number) => errors.points?.[i];
  const campoNumerico = "input h-10 w-24 text-right tabular-nums";

  return (
    <div className="card space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-navy-900">Pontos calibrados</h2>
          <p className="mt-1 text-sm text-graphite-500">
            Para cada ponto, informe o valor do padrão e as leituras do instrumento. O resto é calculado.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-graphite-600">
            Leituras por ponto
            <select className="input h-9 w-16 py-0" value={nLeituras} onChange={(e) => mudarNumeroDeLeituras(Number(e.target.value))}>
              {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <PainelDoCalculo
        instrument={instrument}
        temCriterio={temCriterio}
        toleranciaPorPonto={toleranciaPorPonto}
        incertezaAutomatica={incertezaAutomatica}
        padroes={padroesComIncerteza}
        k={k}
      />

      {errors.points?.message && <p className="field-error">{errors.points.message}</p>}

      <div className="space-y-3">
        {fields.map((field, index) => {
          const p = points?.[index];
          const c = calculos[index];
          const realizado = !!p?.performed;
          const cadastrado = pontoCadastrado(p?.instrumentCalibrationPointId);
          const unidade = cadastrado?.unit || instrument?.unit || "";
          return (
            <div
              key={field.id}
              className={`rounded-xl border p-4 transition-colors ${
                !realizado
                  ? "border-dashed border-graphite-200 bg-graphite-50"
                  : c?.resultado === "FAIL"
                    ? "border-safety-red/30 bg-red-50/30"
                    : "border-graphite-100 bg-white"
              }`}
            >
              <input type="hidden" {...register(`points.${index}.instrumentCalibrationPointId`)} />
              <input type="hidden" {...register(`points.${index}.sensorTypeName`)} />

              {/* Cabecalho do cartao: qual ponto e o resultado dele */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-50 text-sm font-bold text-navy-800">
                    {index + 1}
                  </span>
                  {cadastrado ? (
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-navy-900">{p?.label}</p>
                      <p className="text-xs text-graphite-500">
                        {[p?.sensorTypeName, cadastrado.targetTemperature != null ? `nominal ${fmt(cadastrado.targetTemperature)} ${unidade}` : null, cadastrado.tolerancePercent != null ? `tolerância ± ${fmt(cadastrado.tolerancePercent)}%` : null]
                          .filter(Boolean)
                          .join(" · ") || "Ponto cadastrado no ativo"}
                      </p>
                    </div>
                  ) : (
                    <input
                      className="input h-9 max-w-xs"
                      placeholder="Nome do ponto (opcional)"
                      aria-label={`Nome do ponto ${index + 1}`}
                      {...register(`points.${index}.label`)}
                    />
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {realizado && <SeloDoResultado resultado={c?.resultado ?? null} />}
                  <label className="flex cursor-pointer items-center gap-1.5 text-sm text-graphite-600">
                    <input type="checkbox" className="h-4 w-4" {...register(`points.${index}.performed`)} />
                    Calibrado
                  </label>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-graphite-400 hover:text-safety-red"
                      aria-label={`Remover ponto ${index + 1}`}
                      title="Remover ponto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {realizado ? (
                <>
                  {/* O que o tecnico digita */}
                  <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
                    <div>
                      <label className="field-label" htmlFor={`padrao-${index}`}>
                        Valor do padrão{unidade ? ` (${unidade})` : ""}
                      </label>
                      <input
                        id={`padrao-${index}`}
                        className={`${campoNumerico} ${erroDoPonto(index)?.standardValue ? "input-error" : ""}`}
                        inputMode="decimal"
                        {...register(`points.${index}.standardValue`)}
                      />
                    </div>
                    <div>
                      <span className="field-label">Leituras do instrumento{unidade ? ` (${unidade})` : ""}</span>
                      <div className="flex flex-wrap gap-2">
                        {Array.from({ length: nLeituras }, (_, li) => (
                          <input
                            key={li}
                            className={`${campoNumerico} ${erroDoPonto(index)?.readings?.[li] ? "input-error" : ""}`}
                            inputMode="decimal"
                            placeholder={`${li + 1}ª`}
                            aria-label={`${li + 1}ª leitura do ponto ${index + 1}`}
                            {...register(`points.${index}.readings.${li}`)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* O que o sistema calcula */}
                  <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-graphite-100 bg-graphite-100 sm:grid-cols-4">
                    <Valor titulo="Média das leituras" valor={fmt(c?.media)} />
                    <Valor titulo="Erro (média − padrão)" valor={fmtComSinal(c?.erro)} destaque={c?.resultado === "FAIL"} />
                    <Valor titulo="Tolerância" valor={c?.tolerancia != null ? `± ${fmt(c.tolerancia)}` : "falta o critério"} vazio={c?.tolerancia == null} />
                    <Valor titulo="Incerteza (U)" valor={c?.incerteza != null ? `± ${fmt(c.incerteza)}` : incertezaAutomatica ? "-" : "falta a U do padrão"} vazio={c?.incerteza == null} />
                  </div>

                  {c?.orcamento && (
                    <button
                      type="button"
                      onClick={() => alternar(index)}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-navy-600 hover:underline"
                    >
                      <Calculator className="h-3.5 w-3.5" />
                      {abertos.has(index) ? "Esconder memória de cálculo" : "Ver memória de cálculo da incerteza"}
                    </button>
                  )}
                  {c?.orcamento && abertos.has(index) && <MemoriaDeCalculo orcamento={c.orcamento} k={k} />}
                </>
              ) : (
                <div className="mt-3">
                  <label className="field-label" htmlFor={`motivo-${index}`}>Por que este ponto não foi calibrado?</label>
                  <input
                    id={`motivo-${index}`}
                    className={`input ${erroDoPonto(index)?.notes ? "input-error" : ""}`}
                    placeholder="Ex.: sensor quebrado, sem acesso, equipamento parado"
                    {...register(`points.${index}.notes`)}
                  />
                  {erroDoPonto(index)?.notes?.message && <p className="field-error">{erroDoPonto(index)?.notes?.message}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {confirmandoGeracao && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-safety-yellow/40 bg-safety-yellow/10 px-4 py-2.5 text-sm text-graphite-700">
          <span>
            Substituir os {fields.length} pontos atuais por {quantidadeParaGerar} pontos de {fmt(instrument?.rangeMin ?? 0)} a{" "}
            {fmt(instrument?.rangeMax)}? O que foi digitado será perdido.
          </span>
          <span className="flex gap-2">
            <button type="button" className="btn-outline btn-sm" onClick={() => setConfirmandoGeracao(false)}>Cancelar</button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => gerarPontos(true)}>Substituir</button>
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-graphite-100 pt-4">
        <button type="button" className="btn-outline btn-sm" onClick={() => append({ ...EMPTY_POINT, readings: Array(nLeituras).fill("") })}>
          <Plus className="h-4 w-4" /> Adicionar ponto
        </button>
        {podeGerar && (
          <>
            <span className="text-sm text-graphite-400">ou</span>
            <select
              className="input h-9 w-32 py-0"
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
              <Wand2 className="h-4 w-4" /> Gerar pela faixa do ativo
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Valor({ titulo, valor, destaque = false, vazio = false }: { titulo: string; valor: string; destaque?: boolean; vazio?: boolean }) {
  return (
    <div className="bg-graphite-50 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-graphite-500">{titulo}</p>
      <p
        className={`mt-0.5 tabular-nums ${
          vazio ? "text-xs italic text-safety-yellow-dark" : destaque ? "font-semibold text-safety-red" : "font-semibold text-navy-900"
        }`}
      >
        {valor}
      </p>
    </div>
  );
}

function SeloDoResultado({ resultado }: { resultado: "PASS" | "FAIL" | null }) {
  if (resultado === "PASS") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-safety-green/15 px-3 py-1 text-xs font-semibold text-safety-green-dark">
        <CheckCircle2 className="h-3.5 w-3.5" /> Aprovado
      </span>
    );
  }
  if (resultado === "FAIL") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-safety-red/10 px-3 py-1 text-xs font-semibold text-safety-red">
        <AlertTriangle className="h-3.5 w-3.5" /> Reprovado
      </span>
    );
  }
  return <span className="text-xs text-graphite-400">aguardando leituras</span>;
}

/** Orcamento de incerteza do ponto - de onde saiu o U, parcela por parcela. */
function MemoriaDeCalculo({ orcamento: o, k }: { orcamento: UncertaintyBudget; k: number }) {
  return (
    <div className="mt-2 rounded-lg bg-navy-50/50 px-3 py-2 text-xs text-graphite-600">
      <p className="mb-1 font-semibold text-navy-900">Incerteza pelo GUM (incertezas-padrão de cada parcela)</p>
      <div className="grid gap-x-6 gap-y-0.5 sm:grid-cols-2">
        <p>Padrão (U ÷ k do certificado): {fmt(o.uStandard, 5)}</p>
        <p>Resolução do instrumento (res ÷ 2√3): {fmt(o.uResolution, 5)}</p>
        <p>Repetibilidade (desvio ÷ √n): {fmt(o.uRepeatability, 5)}</p>
        <p>Combinada (√ soma dos quadrados): {fmt(o.uCombined, 5)}</p>
      </div>
      <p className="mt-1 font-semibold text-navy-900">
        U = k × combinada = {fmt(k, 2)} × {fmt(o.uCombined, 5)} = {fmt(o.expanded, 5)}
      </p>
    </div>
  );
}

/**
 * De onde saem tolerancia e incerteza. Faltando o criterio de aceitacao do ativo, ele e'
 * definido aqui mesmo e salvo na ficha do ativo (vale para as proximas calibracoes);
 * faltando a incerteza do padrao, leva direto ao campo do padrao no formulario.
 */
function PainelDoCalculo({
  instrument,
  temCriterio,
  toleranciaPorPonto,
  incertezaAutomatica,
  padroes,
  k,
}: {
  instrument?: Instrument;
  temCriterio: boolean;
  toleranciaPorPonto: boolean;
  incertezaAutomatica: boolean;
  padroes: StandardUncertainty[];
  k: number;
}) {
  const [editando, setEditando] = useState(false);
  const unidade = instrument?.unit ? ` ${instrument.unit}` : "";
  const toleranciaOk = temCriterio || toleranciaPorPonto;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className={`rounded-lg border px-4 py-3 text-sm ${toleranciaOk && !editando ? "border-safety-green/30 bg-safety-green/5" : "border-safety-yellow/40 bg-safety-yellow/5"}`}>
        <div className="flex items-start justify-between gap-2">
          <p className="flex items-center gap-1.5 font-semibold text-navy-900">
            {toleranciaOk ? <CheckCircle2 className="h-4 w-4 text-safety-green-dark" /> : <AlertTriangle className="h-4 w-4 text-safety-yellow-dark" />}
            Tolerância (critério de aceitação)
          </p>
          {instrument && toleranciaOk && !editando && (
            <button type="button" className="inline-flex items-center gap-1 text-xs text-navy-600 hover:underline" onClick={() => setEditando(true)}>
              <Pencil className="h-3 w-3" /> alterar
            </button>
          )}
        </div>
        {toleranciaOk && !editando ? (
          <p className="mt-1 text-graphite-600">
            {temCriterio && instrument
              ? `${fmt(instrument.toleranceValue)}${instrument.toleranceMode === "ABSOLUTE" ? unidade : "%"} - ${MODO_DA_TOLERANCIA[instrument.toleranceMode!]}${
                  instrument.toleranceMode === "PERCENT_FULL_SCALE" && instrument.rangeMax != null
                    ? ` (faixa ${fmt(instrument.rangeMin ?? 0)} a ${fmt(instrument.rangeMax)}${unidade})`
                    : ""
                }${instrument.accuracyClass ? ` · classe ${instrument.accuracyClass}` : ""}`
              : "Pelo % de tolerância cadastrado em cada ponto do ativo."}
          </p>
        ) : instrument ? (
          <CriterioDoAtivo instrument={instrument} onFeito={() => setEditando(false)} onCancelar={toleranciaOk ? () => setEditando(false) : undefined} />
        ) : (
          <p className="mt-1 text-graphite-600">Escolha o ativo para ver o critério de aceitação.</p>
        )}
      </div>

      <div className={`rounded-lg border px-4 py-3 text-sm ${incertezaAutomatica ? "border-safety-green/30 bg-safety-green/5" : "border-safety-yellow/40 bg-safety-yellow/5"}`}>
        <p className="flex items-center gap-1.5 font-semibold text-navy-900">
          {incertezaAutomatica ? <CheckCircle2 className="h-4 w-4 text-safety-green-dark" /> : <AlertTriangle className="h-4 w-4 text-safety-yellow-dark" />}
          Incerteza de medição
        </p>
        {incertezaAutomatica ? (
          <p className="mt-1 text-graphite-600">
            Calculada a partir do padrão (U = {padroes.map((p) => `${fmt(p.expandedUncertainty)}${p.uncertaintyMode === "PERCENT_READING" ? "%" : unidade}`).join(" e ")}),
            da resolução do instrumento{instrument?.resolutionValue ? ` (${fmt(instrument.resolutionValue)}${unidade})` : " (não cadastrada - conta como zero)"} e
            da repetibilidade das leituras, com k = {fmt(k, 2)}.
          </p>
        ) : (
          <>
            <p className="mt-1 text-graphite-600">
              Falta a incerteza expandida (U) do certificado do padrão utilizado. Ela está no certificado do laboratório que calibrou o padrão.
            </p>
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-navy-700 hover:underline"
              onClick={() => {
                const campo = document.querySelector<HTMLInputElement>('input[name="standards.0.expandedUncertainty"]');
                campo?.scrollIntoView({ behavior: "smooth", block: "center" });
                campo?.focus({ preventScroll: true });
              }}
            >
              Informar a incerteza do padrão →
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** Criterio de aceitacao definido na propria calibracao e gravado na ficha do ativo. */
function CriterioDoAtivo({ instrument, onFeito, onCancelar }: { instrument: Instrument; onFeito: () => void; onCancelar?: () => void }) {
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [modo, setModo] = useState<ToleranceMode>(instrument.toleranceMode ?? "PERCENT_FULL_SCALE");
  const [valor, setValor] = useState(paraTexto(instrument.toleranceValue));
  const [minimo, setMinimo] = useState(paraTexto(instrument.rangeMin ?? (instrument.rangeMax != null ? 0 : null)));
  const [maximo, setMaximo] = useState(paraTexto(instrument.rangeMax));
  const [resolucao, setResolucao] = useState(paraTexto(instrument.resolutionValue));
  const [salvando, setSalvando] = useState(false);
  const unidade = instrument.unit ? ` (${instrument.unit})` : "";

  async function salvar() {
    const v = parseDecimal(valor);
    if (v == null) return notify("error", "Informe o valor da tolerância.");
    if (modo === "PERCENT_FULL_SCALE" && parseDecimal(maximo) == null) {
      return notify("error", "Para % do fundo de escala, informe a faixa do instrumento (máximo).");
    }
    setSalvando(true);
    try {
      await updateInstrument(instrument.id, {
        toleranceMode: modo,
        toleranceValue: v,
        rangeMin: parseDecimal(minimo),
        rangeMax: parseDecimal(maximo),
        resolutionValue: parseDecimal(resolucao),
      });
      await queryClient.invalidateQueries({ queryKey: ["instrument-for-validity", instrument.id] });
      notify("success", "Critério salvo na ficha do ativo - vale também para as próximas calibrações.");
      onFeito();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="mt-2 space-y-3">
      <p className="text-graphite-600">Defina aqui; fica salvo na ficha do ativo para as próximas calibrações.</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="field-label">Tolerância</span>
          <input className="input h-9 w-28 text-right" inputMode="decimal" placeholder={modo === "ABSOLUTE" ? "ex.: 0,5" : "ex.: 2"} value={valor} onChange={(e) => setValor(e.target.value)} />
        </label>
        <label className="block">
          <span className="field-label">Expressa em</span>
          <select className="input h-9" value={modo} onChange={(e) => setModo(e.target.value as ToleranceMode)}>
            <option value="PERCENT_FULL_SCALE">% do fundo de escala</option>
            <option value="PERCENT_READING">% do valor medido</option>
            <option value="ABSOLUTE">valor fixo{unidade}</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="field-label">Faixa - mín.{unidade}</span>
          <input className="input h-9 w-24 text-right" inputMode="decimal" value={minimo} onChange={(e) => setMinimo(e.target.value)} />
        </label>
        <label className="block">
          <span className="field-label">Faixa - máx.{unidade}</span>
          <input className="input h-9 w-24 text-right" inputMode="decimal" value={maximo} onChange={(e) => setMaximo(e.target.value)} />
        </label>
        <label className="block">
          <span className="field-label">Resolução{unidade}</span>
          <input className="input h-9 w-28 text-right" inputMode="decimal" placeholder="ex.: 0,1" value={resolucao} onChange={(e) => setResolucao(e.target.value)} />
        </label>
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn-secondary btn-sm" disabled={salvando} onClick={salvar}>
          {salvando ? "Salvando..." : "Salvar no ativo"}
        </button>
        {onCancelar && (
          <button type="button" className="btn-outline btn-sm" onClick={onCancelar}>Cancelar</button>
        )}
      </div>
    </div>
  );
}
