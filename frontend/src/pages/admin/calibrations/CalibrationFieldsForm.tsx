import { useEffect, useRef } from "react";
import { useForm, useFieldArray, Controller, type UseFormSetValue } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { TextInput, TextareaInput, SelectInput } from "../../../components/form/Field";
import { ClientPicker } from "../../../components/ClientPicker";
import { InstrumentPicker } from "../../../components/InstrumentPicker";
import { UserPicker } from "../../../components/UserPicker";
import { createCalibration, updateCalibration } from "../../../api/calibrations";
import type { Calibration } from "../../../api/types";
import { listReferenceStandards, getReferenceStandard } from "../../../api/referenceStandards";
import { listInstrumentCalibrationPoints } from "../../../api/instrumentCalibrationPoints";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";

const pointSchema = z
  .object({
    label: z.string().optional(),
    instrumentCalibrationPointId: z.string().optional(),
    // Nem sempre da' pra calibrar todos os pontos na mesma visita (sensor quebrado,
    // dificil acesso...) - desmarcado, so' pede a observacao, sem leituras, e o ponto
    // continua vencido (a data dele nao avanca ao emitir o certificado).
    performed: z.boolean(),
    notes: z.string().optional(),
    standardValue: z.coerce.number().optional(),
    indicatedValue: z.coerce.number().optional(),
    error: z.coerce.number().optional(),
    tolerance: z.coerce.number().optional(),
    uncertainty: z.coerce.number().optional(),
    result: z.enum(["PASS", "FAIL"]).optional(),
  })
  .superRefine((point, ctx) => {
    if (!point.performed) {
      if (!point.notes?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["notes"], message: "Explique por que este ponto nao foi calibrado." });
      }
      return;
    }
    if (point.standardValue == null) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["standardValue"], message: "Obrigatorio." });
    if (point.indicatedValue == null) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["indicatedValue"], message: "Obrigatorio." });
    if (point.error == null) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["error"], message: "Obrigatorio." });
    if (point.tolerance == null) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["tolerance"], message: "Obrigatorio." });
    if (point.uncertainty == null) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["uncertainty"], message: "Obrigatorio." });
    if (!point.result) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["result"], message: "Obrigatorio." });
  });

const EMPTY_POINT = {
  label: "",
  instrumentCalibrationPointId: "",
  performed: true,
  notes: "",
  standardValue: 0,
  indicatedValue: 0,
  error: 0,
  tolerance: 0,
  uncertainty: 0,
  result: "PASS" as const,
};

const standardSchema = z.object({
  description: z.string().min(1, "Descreva o padrao."),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  certificateNumber: z.string().optional(),
  certificateValidUntil: z.string().optional(),
  laboratory: z.string().optional(),
  // Preenchido ao escolher um padrao do catalogo interno (Cadastros > Padroes de
  // referencia) - os campos acima continuam sendo o snapshot que vale no laudo.
  referenceStandardId: z.string().optional(),
});

const schema = z.object({
  clientId: z.string().uuid("Selecione o cliente."),
  instrumentId: z.string().uuid("Selecione o instrumento."),
  technicianId: z.string().uuid("Selecione o tecnico responsavel."),
  calibrationDate: z.string().min(1, "Informe a data."),
  location: z.string().min(1, "Informe o local."),
  procedure: z.string().optional(),
  coverageFactorK: z.coerce.number().optional(),
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
type FormValues = z.infer<typeof schema>;

const EMPTY_STANDARD = {
  description: "",
  manufacturer: "",
  model: "",
  serialNumber: "",
  certificateNumber: "",
  certificateValidUntil: "",
  laboratory: "",
  referenceStandardId: "",
};

function toFormValues(calibration: Calibration): FormValues {
  return {
    clientId: calibration.clientId,
    instrumentId: calibration.instrumentId,
    technicianId: calibration.technicianId,
    calibrationDate: calibration.calibrationDate.slice(0, 10),
    location: calibration.location,
    procedure: calibration.procedure ?? "",
    coverageFactorK: calibration.coverageFactorK ?? 2,
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
          instrumentCalibrationPointId: p.instrumentCalibrationPointId ?? "",
          performed: p.performed ?? true,
          notes: p.notes ?? "",
          standardValue: p.standardValue ?? 0,
          indicatedValue: p.indicatedValue ?? 0,
          error: p.error ?? 0,
          tolerance: p.tolerance ?? 0,
          uncertainty: p.uncertainty ?? 0,
          result: p.result ?? "PASS",
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

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: calibration
      ? toFormValues(calibration)
      : {
          clientId: initialClientId ?? "",
          instrumentId: initialInstrumentId ?? "",
          result: "APPROVED",
          coverageFactorK: 2,
          points: [{ ...EMPTY_POINT }],
          standards: [{ ...EMPTY_STANDARD }],
        },
  });

  const { fields, append, remove, replace } = useFieldArray({ control, name: "points" });
  const {
    fields: standardFields,
    append: appendStandard,
    remove: removeStandard,
  } = useFieldArray({ control, name: "standards" });
  const clientId = watch("clientId");
  const instrumentId = watch("instrumentId");

  // Se o ativo escolhido tem pontos de calibracao cadastrados (ex.: os 10 PT-100 de uma
  // extrusora), a tabela de pontos ja abre com uma linha por ponto em vez de em branco -
  // so troca quando o ativo muda de fato, pra nao apagar o que o tecnico ja preencheu.
  // Num rascunho existente, os pontos ja salvos (mesmo sem instrumentCalibrationPointId,
  // ex.: calibracao antiga) contam como "ja aplicado" - nao reescreve por cima.
  const { data: registeredPoints } = useQuery({
    queryKey: ["instrument-calibration-points-for-form", instrumentId],
    queryFn: () => listInstrumentCalibrationPoints(instrumentId),
    enabled: !!instrumentId,
  });
  const lastAppliedInstrumentId = useRef<string | null>(calibration?.instrumentId ?? null);
  useEffect(() => {
    if (!instrumentId || registeredPoints === undefined) return;
    if (lastAppliedInstrumentId.current === instrumentId) return;
    lastAppliedInstrumentId.current = instrumentId;
    if (registeredPoints.length > 0) {
      replace(
        registeredPoints.map((p) => ({
          ...EMPTY_POINT,
          label: p.label,
          instrumentCalibrationPointId: p.id,
        })),
      );
    }
  }, [instrumentId, registeredPoints, replace]);

  async function onSubmit(values: FormValues) {
    try {
      const saved = isEditing ? await updateCalibration(calibration.id, values) : await createCalibration(values);
      if (isEditing) reset(toFormValues(saved));
      notify("success", isEditing ? "Alteracoes salvas." : `Certificado ${saved.certificateNumber} criado como rascunho.`);
      onSaved(saved);
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  return (
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
          <TextInput label="Validade ate" type="date" required error={errors.validUntil?.message} {...register("validUntil")} />
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
        <div className="grid gap-4 sm:grid-cols-3">
          <TextInput label="Temperatura ambiente (°C)" type="number" step="0.1" {...register("ambientTemperature")} />
          <TextInput label="Umidade relativa (%)" type="number" step="0.1" {...register("ambientHumidity")} />
          <TextInput label="Observacoes ambientais" {...register("environmentalNotes")} />
        </div>
      </div>

      <div className="card space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-navy-900">Pontos calibrados</h2>
          <button type="button" className="btn-ghost btn-sm" onClick={() => append({ ...EMPTY_POINT })}>
            <Plus className="h-4 w-4" /> Adicionar ponto
          </button>
        </div>
        {errors.points?.message && <p className="field-error">{errors.points.message}</p>}
        {registeredPoints && registeredPoints.length > 0 && (
          <p className="text-xs text-graphite-500">
            Pontos pre-cadastrados neste ativo - preenchidos automaticamente abaixo. Emitir o certificado atualiza a proxima data de calibracao de cada um.
          </p>
        )}

        <div className="table-shell">
          <table className="table-base">
            <thead>
              <tr>
                <th>Ponto</th>
                <th>Realizado</th>
                <th>Valor padrao</th>
                <th>Valor indicado</th>
                <th>Erro</th>
                <th>Tolerancia</th>
                <th>Incerteza</th>
                <th>Resultado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => {
                const performed = watch(`points.${index}.performed`);
                return (
                  <tr key={field.id}>
                    <td>
                      <input type="hidden" {...register(`points.${index}.instrumentCalibrationPointId`)} />
                      <input
                        className="input"
                        placeholder="Ex.: PT-100 - Zona 1"
                        {...register(`points.${index}.label`)}
                      />
                    </td>
                    <td className="text-center">
                      <input type="checkbox" className="h-4 w-4" {...register(`points.${index}.performed`)} />
                    </td>
                    {performed ? (
                      <>
                        <td><input className="input" type="number" step="any" {...register(`points.${index}.standardValue`)} /></td>
                        <td><input className="input" type="number" step="any" {...register(`points.${index}.indicatedValue`)} /></td>
                        <td><input className="input" type="number" step="any" {...register(`points.${index}.error`)} /></td>
                        <td><input className="input" type="number" step="any" {...register(`points.${index}.tolerance`)} /></td>
                        <td><input className="input" type="number" step="any" {...register(`points.${index}.uncertainty`)} /></td>
                        <td>
                          <Controller
                            control={control}
                            name={`points.${index}.result`}
                            render={({ field: f }) => (
                              <select className="input" {...f} value={f.value ?? "PASS"}>
                                <option value="PASS">Aprovado</option>
                                <option value="FAIL">Reprovado</option>
                              </select>
                            )}
                          />
                        </td>
                      </>
                    ) : (
                      <td colSpan={6}>
                        <input
                          className="input"
                          placeholder="Por que este ponto nao foi calibrado (ex.: sensor quebrado, sem acesso)"
                          {...register(`points.${index}.notes`)}
                        />
                        {errors.points?.[index]?.notes?.message && (
                          <p className="field-error">{errors.points[index]?.notes?.message}</p>
                        )}
                      </td>
                    )}
                    <td>
                      {fields.length > 1 && (
                        <button type="button" onClick={() => remove(index)} className="text-graphite-400 hover:text-safety-red" aria-label="Remover ponto">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

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
          {...register("result")}
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
