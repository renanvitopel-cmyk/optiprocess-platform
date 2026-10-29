import { useCallback, useEffect, useRef } from "react";
import { useForm, useFieldArray, FormProvider, type UseFormSetValue } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { TextInput, TextareaInput, SelectInput } from "../../../components/form/Field";
import { UncertaintyFields, parseDecimal } from "../../../components/form/UncertaintyFields";
import { CalibrationPointsEditor, EMPTY_POINT, type ResumoDosPontos } from "./CalibrationPointsEditor";
import { ClientPicker } from "../../../components/ClientPicker";
import { InstrumentPicker } from "../../../components/InstrumentPicker";
import { UserPicker } from "../../../components/UserPicker";
import { createCalibration, updateCalibration } from "../../../api/calibrations";
import { getInstrument } from "../../../api/instruments";
import type { Calibration } from "../../../api/types";
import { listReferenceStandards, getReferenceStandard } from "../../../api/referenceStandards";
import { listInstrumentCalibrationPoints } from "../../../api/instrumentCalibrationPoints";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";

// Valores numericos dos pontos ficam como texto no formulario (aceitam virgula e podem
// estar em branco - "" nunca pode virar 0, que e' uma leitura valida e errada). Viram
// numero so' no envio, em toPayload.
const pointSchema = z
  .object({
    label: z.string().optional(),
    sensorTypeName: z.string().optional(),
    instrumentCalibrationPointId: z.string().optional(),
    // Nem sempre da' pra calibrar todos os pontos na mesma visita (sensor quebrado,
    // dificil acesso...) - desmarcado, so' pede a observacao, sem leituras, e o ponto
    // continua vencido (a data dele nao avanca ao emitir o certificado).
    performed: z.boolean(),
    notes: z.string().optional(),
    standardValue: z.string().optional(),
    // Repetibilidade: no minimo 3 leituras - media, erro, desvio, tolerancia, incerteza e
    // resultado saem delas (ver CalibrationPointsEditor e o recalculo no servidor).
    readings: z.array(z.string()),
    // So' digitados quando faltar cadastro para calcular (ativo sem criterio de aceitacao,
    // padrao sem incerteza) - o editor so' mostra o campo nesse caso.
    tolerance: z.string().optional(),
    uncertainty: z.string().optional(),
  })
  .superRefine((point, ctx) => {
    if (!point.performed) {
      if (!point.notes?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["notes"], message: "Explique por que este ponto nao foi calibrado." });
      }
      return;
    }
    if (parseDecimal(point.standardValue) == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["standardValue"], message: "Obrigatorio." });
    }
    point.readings.forEach((r, i) => {
      if (parseDecimal(r) == null) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["readings", i], message: "Obrigatorio." });
    });
    if (point.readings.length < 3) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["readings"], message: "Inclua pelo menos 3 medicoes." });
    }
  });

const standardSchema = z.object({
  description: z.string().min(1, "Descreva o padrao."),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  certificateNumber: z.string().optional(),
  certificateValidUntil: z.string().optional(),
  laboratory: z.string().optional(),
  // Incerteza declarada no certificado do padrao - a parcela principal da incerteza
  // calculada em cada ponto.
  expandedUncertainty: z.string().optional(),
  uncertaintyMode: z.enum(["ABSOLUTE", "PERCENT_READING"]).optional(),
  uncertaintyK: z.string().optional(),
  // Preenchido ao escolher um padrao do catalogo interno (Cadastros > Padroes de
  // referencia) - os campos acima continuam sendo o snapshot que vale no laudo.
  referenceStandardId: z.string().optional(),
});

/** Numero gravado -> texto do campo, com virgula decimal. */
function paraTexto(v: number | null | undefined): string {
  return v == null ? "" : String(v).replace(".", ",");
}

const schema = z.object({
  clientId: z.string().uuid("Selecione o cliente."),
  instrumentId: z.string().uuid("Selecione o instrumento."),
  technicianId: z.string().uuid("Selecione o tecnico responsavel."),
  calibrationDate: z.string().min(1, "Informe a data."),
  location: z.string().min(1, "Informe o local."),
  procedure: z.string().optional(),
  coverageFactorK: z.coerce.number().optional(),
  decisionRule: z.enum(["SIMPLE", "GUARD_BAND"]),
  ambientTemperature: z.coerce.number().optional(),
  ambientHumidity: z.coerce.number().optional(),
  environmentalNotes: z.string().optional(),
  result: z.enum(["APPROVED", "APPROVED_WITH_RESTRICTION", "REJECTED"]),
  technicalConclusion: z.string().min(1, "Informe a conclusao tecnica."),
  observations: z.string().optional(),
  validUntil: z.string().min(1, "Informe a validade."),
  points: z.array(pointSchema).min(1, "Inclua ao menos um ponto calibrado."),
  standards: z.array(standardSchema).min(1, "Informe ao menos um padrao utilizado."),
});
export type FormValues = z.infer<typeof schema>;

const EMPTY_STANDARD = {
  description: "",
  manufacturer: "",
  model: "",
  serialNumber: "",
  certificateNumber: "",
  certificateValidUntil: "",
  laboratory: "",
  expandedUncertainty: "",
  uncertaintyMode: "ABSOLUTE" as const,
  uncertaintyK: "2",
  referenceStandardId: "",
};

/** Texto do formulario -> corpo da API (numeros de verdade, null onde ficou em branco). */
function toPayload(values: FormValues) {
  return {
    ...values,
    points: values.points.map((p) => ({
      ...p,
      standardValue: parseDecimal(p.standardValue),
      readings: p.performed ? p.readings.map((r) => parseDecimal(r) ?? 0) : [],
      tolerance: parseDecimal(p.tolerance),
      uncertainty: parseDecimal(p.uncertainty),
    })),
    standards: values.standards.map((s) => ({
      ...s,
      expandedUncertainty: parseDecimal(s.expandedUncertainty),
      uncertaintyK: parseDecimal(s.uncertaintyK),
    })),
  };
}

function toFormValues(calibration: Calibration): FormValues {
  return {
    clientId: calibration.clientId,
    instrumentId: calibration.instrumentId,
    technicianId: calibration.technicianId,
    calibrationDate: calibration.calibrationDate.slice(0, 10),
    location: calibration.location,
    procedure: calibration.procedure ?? "",
    coverageFactorK: calibration.coverageFactorK ?? 2,
    decisionRule: calibration.decisionRule ?? "SIMPLE",
    ambientTemperature: calibration.ambientTemperature ?? undefined,
    ambientHumidity: calibration.ambientHumidity ?? undefined,
    environmentalNotes: calibration.environmentalNotes ?? "",
    result: calibration.result,
    technicalConclusion: calibration.technicalConclusion,
    observations: calibration.observations ?? "",
    validUntil: calibration.validUntil.slice(0, 10),
    points: calibration.points.length
      ? calibration.points.map((p) => ({
          label: p.label ?? "",
          sensorTypeName: p.sensorTypeName ?? "",
          instrumentCalibrationPointId: p.instrumentCalibrationPointId ?? "",
          performed: p.performed ?? true,
          notes: p.notes ?? "",
          standardValue: paraTexto(p.standardValue),
          readings: p.readings?.length ? p.readings.map((r) => paraTexto(r.value)) : ["", "", ""],
          // So' os valores digitados a mao voltam para o campo; os calculados o editor
          // recalcula na tela.
          tolerance: p.toleranceCalculated ? "" : paraTexto(p.tolerance),
          uncertainty: p.uncertaintyCalculated ? "" : paraTexto(p.uncertainty),
        }))
      : [{ ...EMPTY_POINT }],
    standards: calibration.standards.length
      ? calibration.standards.map((s) => ({
          description: s.description,
          manufacturer: s.manufacturer ?? "",
          model: s.model ?? "",
          serialNumber: s.serialNumber ?? "",
          certificateNumber: s.certificateNumber ?? "",
          certificateValidUntil: s.certificateValidUntil?.slice(0, 10) ?? "",
          laboratory: s.laboratory ?? "",
          expandedUncertainty: paraTexto(s.expandedUncertainty),
          uncertaintyMode: s.uncertaintyMode ?? "ABSOLUTE",
          uncertaintyK: paraTexto(s.uncertaintyK ?? 2),
          referenceStandardId: s.referenceStandardId ?? "",
        }))
      : [{ ...EMPTY_STANDARD }],
  };
}

interface Props {
  /** Rascunho existente - se vier, o formulario edita (PATCH) em vez de criar (POST). */
  calibration?: Calibration;
  initialClientId?: string;
  initialInstrumentId?: string;
  onSaved: (calibration: Calibration) => void;
  onCancel?: () => void;
}

/**
 * Campos de identificacao, padroes, pontos, condicoes ambientais e resultado de uma
 * calibracao - usado tanto para criar (tela "Nova calibracao") quanto para continuar
 * editando um rascunho (ficha do certificado, antes de emitir), como uma unica tela de
 * trabalho de campo em vez de duas telas separadas.
 */
export function CalibrationFieldsForm({ calibration, initialClientId, initialInstrumentId, onSaved, onCancel }: Props) {
  const { notify } = useToast();
  const isEditing = !!calibration;

  const methods = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: calibration
      ? toFormValues(calibration)
      : {
          clientId: initialClientId ?? "",
          instrumentId: initialInstrumentId ?? "",
          result: "APPROVED",
          coverageFactorK: 2,
          decisionRule: "SIMPLE",
          points: [{ ...EMPTY_POINT }],
          standards: [{ ...EMPTY_STANDARD }],
        },
  });
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = methods;

  const {
    fields: standardFields,
    append: appendStandard,
    remove: removeStandard,
  } = useFieldArray({ control, name: "standards" });
  const clientId = watch("clientId");
  const instrumentId = watch("instrumentId");

  // Pontos pre-cadastrados no ativo (ex.: os 10 PT-100 de uma extrusora) - o editor de
  // pontos abre com uma linha por ponto; aqui servem tambem para a validade sugerida.
  const { data: registeredPoints } = useQuery({
    queryKey: ["instrument-calibration-points-for-form", instrumentId],
    queryFn: () => listInstrumentCalibrationPoints(instrumentId),
    enabled: !!instrumentId,
  });

  // Validade da calibracao segue a periodicidade cadastrada no ativo (ex.: a cada 6 meses
  // -> validade de 6 meses) - da preferencia pra periodicidade do proprio ativo; sem ela,
  // usa a menor entre os pontos cadastrados (o certificado so' vale ate o primeiro ponto
  // vencer). So' sugere uma vez (nao sobrescreve o que o tecnico ja preencheu/editou).
  // A ficha do ativo tambem traz o criterio de aceitacao usado nos calculos dos pontos.
  const { data: instrumentDetail } = useQuery({
    queryKey: ["instrument-for-validity", instrumentId],
    queryFn: () => getInstrument(instrumentId),
    enabled: !!instrumentId,
  });
  const calibrationDate = watch("calibrationDate");
  const validUntil = watch("validUntil");
  useEffect(() => {
    if (!calibrationDate || validUntil || !instrumentId) return;
    const frequenciasDosPontos = (registeredPoints ?? [])
      .map((p) => p.calibrationFrequencyMonths)
      .filter((f): f is number => f != null);
    const frequencia =
      instrumentDetail?.calibrationFrequencyMonths ?? (frequenciasDosPontos.length > 0 ? Math.min(...frequenciasDosPontos) : null);
    if (!frequencia) return;
    const data = new Date(`${calibrationDate}T00:00:00`);
    data.setMonth(data.getMonth() + frequencia);
    setValue("validUntil", data.toISOString().slice(0, 10));
  }, [calibrationDate, validUntil, instrumentId, instrumentDetail, registeredPoints, setValue]);

  // Resultado final sugerido pelos pontos (todos aprovados -> Aprovado; algum reprovado ->
  // Reprovado; algum nao realizado -> Aprovado com ressalva). So' enquanto o tecnico nao
  // escolher outro a mao - a decisao final continua sendo dele.
  const resultadoEscolhidoAMao = useRef(isEditing);
  const { getValues } = methods;
  const onResumoDosPontos = useCallback(
    (resumo: ResumoDosPontos) => {
      if (resultadoEscolhidoAMao.current || !resumo.completo) return;
      const sugerido = resumo.reprovados > 0 ? "REJECTED" : resumo.naoRealizados > 0 ? "APPROVED_WITH_RESTRICTION" : "APPROVED";
      if (getValues("result") !== sugerido) setValue("result", sugerido);
    },
    [getValues, setValue],
  );

  async function onSubmit(values: FormValues) {
    try {
      const payload = toPayload(values);
      const saved = isEditing ? await updateCalibration(calibration.id, payload) : await createCalibration(payload);
      if (isEditing) reset(toFormValues(saved));
      notify("success", isEditing ? "Alteracoes salvas." : `Certificado ${saved.certificateNumber} criado como rascunho.`);
      onSaved(saved);
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  return (
    <FormProvider {...methods}>
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="card space-y-4 p-5">
        <h2 className="font-semibold text-navy-900">Identificacao</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <ClientPicker required error={errors.clientId?.message} {...register("clientId")} />
          <InstrumentPicker clientId={clientId} required error={errors.instrumentId?.message} {...register("instrumentId")} />
          <UserPicker label="Tecnico responsavel" roles={["ADMIN", "TECHNICIAN"]} required error={errors.technicianId?.message} {...register("technicianId")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextInput label="Data da calibracao" type="date" required error={errors.calibrationDate?.message} {...register("calibrationDate")} />
          <TextInput label="Local" required error={errors.location?.message} {...register("location")} />
          <TextInput
            label="Validade ate"
            type="date"
            required
            hint="Sugerida pela periodicidade do ativo - pode ajustar se o laboratorio definir outra."
            error={errors.validUntil?.message}
            {...register("validUntil")}
          />
        </div>
      </div>

      <div className="card space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-navy-900">Padroes utilizados e rastreabilidade</h2>
            <p className="mt-1 text-xs text-graphite-500">
              Informe o certificado de cada padrao usado. E o que garante a cadeia de rastreabilidade do documento.
            </p>
          </div>
          <button type="button" className="btn-ghost btn-sm shrink-0" onClick={() => appendStandard({ ...EMPTY_STANDARD })}>
            <Plus className="h-4 w-4" /> Adicionar padrao
          </button>
        </div>
        {errors.standards?.message && <p className="field-error">{errors.standards.message}</p>}

        <div className="space-y-4">
          {standardFields.map((field, index) => (
            <div key={field.id} className="rounded-lg border border-gray-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-graphite-400">
                  Padrao {index + 1}
                </span>
                {standardFields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStandard(index)}
                    className="text-graphite-400 hover:text-safety-red"
                    aria-label={`Remover padrao ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <input type="hidden" {...register(`standards.${index}.referenceStandardId`)} />
              <ReferenceStandardFillSelect index={index} setValue={setValue} />
              <div className="grid gap-4 sm:grid-cols-3">
                <TextInput
                  label="Descricao do padrao"
                  required
                  className="sm:col-span-2"
                  placeholder="Ex.: Calibrador de temperatura de bloco seco"
                  error={errors.standards?.[index]?.description?.message}
                  {...register(`standards.${index}.description`)}
                />
                <TextInput label="Fabricante" {...register(`standards.${index}.manufacturer`)} />
                <TextInput label="Modelo" {...register(`standards.${index}.model`)} />
                <TextInput label="No de serie" {...register(`standards.${index}.serialNumber`)} />
                <TextInput label="No do certificado" {...register(`standards.${index}.certificateNumber`)} />
                <TextInput
                  label="Validade do certificado"
                  type="date"
                  {...register(`standards.${index}.certificateValidUntil`)}
                />
                <TextInput
                  label="Laboratorio emissor"
                  className="sm:col-span-2"
                  placeholder="Ex.: RBC / Rede Brasileira de Calibracao"
                  {...register(`standards.${index}.laboratory`)}
                />
              </div>
              <UncertaintyFields
                className="mt-4"
                expanded={register(`standards.${index}.expandedUncertainty`)}
                mode={register(`standards.${index}.uncertaintyMode`)}
                k={register(`standards.${index}.uncertaintyK`)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="card space-y-4 p-5">
        <h2 className="font-semibold text-navy-900">Metodo e condicoes ambientais</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Metodo / procedimento"
            placeholder="Ex.: IT-CAL-001 / comparacao direta"
            {...register("procedure")}
          />
          <TextInput
            label="Fator de abrangencia (k)"
            type="number"
            step="0.01"
            hint="Padrao k=2, equivalente a ~95% de confianca."
            {...register("coverageFactorK")}
          />
        </div>
        <SelectInput
          label="Regra de aprovação de cada ponto"
          options={[
            { value: "SIMPLE", label: "|erro| ≤ tolerância (incerteza declarada à parte)" },
            { value: "GUARD_BAND", label: "|erro| + incerteza ≤ tolerância (mais rígida)" },
          ]}
          hint="A mais usada fora da RBC é a primeira. Sai descrita no certificado."
          {...register("decisionRule")}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <TextInput label="Temperatura ambiente (°C)" type="number" step="0.1" {...register("ambientTemperature")} />
          <TextInput label="Umidade relativa (%)" type="number" step="0.1" {...register("ambientHumidity")} />
          <TextInput label="Observacoes ambientais" {...register("environmentalNotes")} />
        </div>
      </div>

      <CalibrationPointsEditor
        instrument={instrumentDetail}
        registeredPoints={registeredPoints}
        savedInstrumentId={calibration?.instrumentId ?? null}
        onResumo={onResumoDosPontos}
      />

      <div className="card space-y-4 p-5">
        <h2 className="font-semibold text-navy-900">Resultado</h2>
        <SelectInput
          label="Resultado final"
          required
          options={[
            { value: "APPROVED", label: "Aprovado" },
            { value: "APPROVED_WITH_RESTRICTION", label: "Aprovado com ressalva" },
            { value: "REJECTED", label: "Reprovado" },
          ]}
          error={errors.result?.message}
          hint="Sugerido pelos resultados dos pontos - pode trocar."
          {...register("result", {
            onChange: () => {
              resultadoEscolhidoAMao.current = true;
            },
          })}
        />
        <TextareaInput label="Conclusao tecnica" required rows={4} error={errors.technicalConclusion?.message} {...register("technicalConclusion")} />
        <TextareaInput
          label="Observacoes (opcional)"
          rows={3}
          hint="Sai no certificado, abaixo da conclusao."
          {...register("observations")}
        />
      </div>

      <div className="flex justify-end gap-3">
        {onCancel && (
          <button type="button" className="btn-outline" onClick={onCancel}>Cancelar</button>
        )}
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : isEditing ? "Salvar dados" : "Iniciar calibracao"}
        </button>
      </div>
    </form>
    </FormProvider>
  );
}

/** Preenche uma linha de "padrao utilizado" a partir do catalogo interno (Cadastros >
 * Padroes de referencia): puxa fabricante/modelo/serie e o certificado vigente do padrao
 * escolhido, mas grava tudo como campos de texto normais - o laudo continua sendo o
 * snapshot editavel, nao um link vivo para o catalogo. */
function ReferenceStandardFillSelect({ index, setValue }: { index: number; setValue: UseFormSetValue<FormValues> }) {
  const { data: standards } = useQuery({
    queryKey: ["reference-standards-picker"],
    queryFn: () => listReferenceStandards({ active: true }),
    staleTime: 60_000,
  });

  async function onSelect(id: string) {
    if (!id) return;
    const full = await getReferenceStandard(id);
    const latest = full.certificates?.[0];
    setValue(`standards.${index}.referenceStandardId`, full.id);
    setValue(`standards.${index}.description`, full.description);
    setValue(`standards.${index}.manufacturer`, full.manufacturer ?? "");
    setValue(`standards.${index}.model`, full.model ?? "");
    setValue(`standards.${index}.serialNumber`, full.serialNumber ?? "");
    if (latest) {
      setValue(`standards.${index}.certificateNumber`, latest.certificateNumber ?? "");
      setValue(`standards.${index}.certificateValidUntil`, latest.validUntil.slice(0, 10));
      setValue(`standards.${index}.laboratory`, latest.laboratory ?? "");
      // A incerteza do certificado vigente do padrao e' o que alimenta o calculo dos pontos.
      setValue(`standards.${index}.expandedUncertainty`, paraTexto(latest.expandedUncertainty));
      setValue(`standards.${index}.uncertaintyMode`, latest.uncertaintyMode ?? "ABSOLUTE");
      setValue(`standards.${index}.uncertaintyK`, paraTexto(latest.uncertaintyK ?? 2));
    }
  }

  return (
    <div className="mb-3">
      <label className="field-label">Preencher do catalogo</label>
      <select
        className="input"
        defaultValue=""
        onChange={(e) => onSelect(e.target.value)}
      >
        <option value="">Digitar manualmente</option>
        {(standards ?? []).map((s) => (
          <option key={s.id} value={s.id}>
            {s.description}{s.certificationStatus === "EXPIRED" ? " (certificado vencido)" : ""}
            {s.certificationStatus === "NO_CERTIFICATE" ? " (sem certificado)" : ""}
          </option>
        ))}
      </select>
      <p className="field-hint">Opcional. Preenche os campos abaixo com um padrao ja cadastrado - continuam editaveis.</p>
    </div>
  );
}
