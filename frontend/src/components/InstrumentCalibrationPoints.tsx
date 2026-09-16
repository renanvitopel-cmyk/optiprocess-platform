import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  listInstrumentCalibrationPoints,
  createInstrumentCalibrationPoint,
  updateInstrumentCalibrationPoint,
  deleteInstrumentCalibrationPoint,
} from "../api/instrumentCalibrationPoints";
import { listMeasurementTypes } from "../api/measurementTypes";
import { listSensorTypes } from "../api/sensorTypes";
import type { InstrumentCalibrationPoint, MeasurementFieldProfile } from "../api/types";
import { Modal } from "./Modal";
import { TextInput, SelectInput } from "./form/Field";
import { StatusBadge } from "./StatusBadge";
import { EmptyState } from "./EmptyState";
import { ConfirmDialog } from "./ConfirmDialog";
import { useToast } from "./Toast";
import { getApiErrorMessage } from "../api/client";
import { formatDate } from "../lib/format";

// Campo numerico opcional vindo de um <input type="number">: em branco manda "" (nao
// undefined), e z.coerce.number() transformaria isso em 0 antes de chegar num literal("")
// - trata "" como ausencia de valor primeiro, do mesmo jeito que dataOpcional no backend.
const numeroOpcional = z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : v), z.coerce.number().optional());

const schema = z.object({
  label: z.string().min(1, "Informe o nome do ponto."),
  measurementTypeId: z.string().optional(),
  sensorTypeId: z.string().optional(),
  measurementRange: z.string().optional(),
  unit: z.string().optional(),
  targetTemperature: numeroOpcional,
  tolerancePercent: numeroOpcional,
  zeroValue: numeroOpcional,
  spanValue: numeroOpcional,
  calibrationFrequencyMonths: numeroOpcional,
});
type FormValues = z.infer<typeof schema>;

/** Resumo do que o ponto pede alem de faixa/unidade, pra mostrar na listagem sem abrir o
 * formulario. */
function resumoDosCamposExtras(p: InstrumentCalibrationPoint): string | null {
  if (p.targetTemperature != null || p.tolerancePercent != null) {
    const alvo = p.targetTemperature != null ? `${p.targetTemperature}${p.unit ?? ""}` : "-";
    const tol = p.tolerancePercent != null ? ` ± ${p.tolerancePercent}%` : "";
    return `Alvo: ${alvo}${tol}`;
  }
  if (p.zeroValue != null || p.spanValue != null) {
    return `Zero: ${p.zeroValue ?? "-"} · Span: ${p.spanValue ?? "-"}`;
  }
  return null;
}

/** Pontos calibraveis dentro de um ativo maior - ex.: os 10 PT-100 de uma extrusora.
 * Cada ponto tem seu proprio ciclo de calibracao, independente dos outros e do ativo
 * como um todo; e' o que o formulario de nova calibracao usa para pre-preencher a
 * tabela de pontos em vez de comecar em branco. */
export function InstrumentCalibrationPoints({
  instrumentId,
  canEdit,
  instrumentCalibrationFrequencyMonths,
}: {
  instrumentId: string;
  canEdit: boolean;
  /** Periodicidade cadastrada no proprio ativo - novo ponto ja nasce com ela por padrao,
   * mas continua editavel: cada ponto pode ter seu proprio ciclo se precisar. */
  instrumentCalibrationFrequencyMonths?: number | null;
}) {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InstrumentCalibrationPoint | null>(null);
  const [removing, setRemoving] = useState<InstrumentCalibrationPoint | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: points, isLoading } = useQuery({
    queryKey: ["instrument-calibration-points", instrumentId],
    queryFn: () => listInstrumentCalibrationPoints(instrumentId),
  });

  const { data: measurementTypes } = useQuery({
    queryKey: ["measurement-types-picker"],
    queryFn: () => listMeasurementTypes({ active: true }),
    staleTime: 60_000,
  });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const measurementTypeId = watch("measurementTypeId");
  const sensorTypeId = watch("sensorTypeId");
  const fieldProfile: MeasurementFieldProfile =
    measurementTypes?.find((t) => t.id === measurementTypeId)?.fieldProfile ?? "GENERIC";

  const { data: sensorTypes } = useQuery({
    queryKey: ["sensor-types-picker", measurementTypeId],
    queryFn: () => listSensorTypes({ measurementTypeId, active: true }),
    enabled: !!measurementTypeId,
  });

  function openCreate() {
    reset({
      label: "",
      measurementTypeId: "",
      sensorTypeId: "",
      measurementRange: "",
      unit: "",
      calibrationFrequencyMonths: instrumentCalibrationFrequencyMonths ?? undefined,
    });
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(point: InstrumentCalibrationPoint) {
    reset({
      label: point.label,
      measurementTypeId: point.measurementTypeId ?? "",
      sensorTypeId: point.sensorTypeId ?? "",
      measurementRange: point.measurementRange ?? "",
      unit: point.unit ?? "",
      targetTemperature: point.targetTemperature ?? undefined,
      tolerancePercent: point.tolerancePercent ?? undefined,
      zeroValue: point.zeroValue ?? undefined,
      spanValue: point.spanValue ?? undefined,
      calibrationFrequencyMonths: point.calibrationFrequencyMonths ?? undefined,
    });
    setEditing(point);
    setFormOpen(true);
  }

  function onMeasurementTypeChange(id: string) {
    setValue("measurementTypeId", id);
    setValue("sensorTypeId", ""); // tipo de sensor e' proprio de cada grandeza, nao vale para a nova
    const tipo = measurementTypes?.find((t) => t.id === id);
    if (tipo?.defaultUnit) setValue("unit", tipo.defaultUnit);
  }

  async function onSubmit(values: FormValues) {
    try {
      const payload = {
        label: values.label,
        measurementTypeId: values.measurementTypeId || null,
        sensorTypeId: values.sensorTypeId || null,
        measurementRange: values.measurementRange || null,
        unit: values.unit || null,
        targetTemperature: fieldProfile === "TEMPERATURE" ? values.targetTemperature ?? null : null,
        tolerancePercent: fieldProfile === "TEMPERATURE" ? values.tolerancePercent ?? null : null,
        zeroValue: fieldProfile === "SCALE" ? values.zeroValue ?? null : null,
        spanValue: fieldProfile === "SCALE" ? values.spanValue ?? null : null,
        calibrationFrequencyMonths: values.calibrationFrequencyMonths ?? null,
      };
      if (editing) {
        await updateInstrumentCalibrationPoint(instrumentId, editing.id, payload);
        notify("success", "Ponto atualizado.");
      } else {
        await createInstrumentCalibrationPoint(instrumentId, payload);
        notify("success", "Ponto cadastrado.");
      }
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ["instrument-calibration-points", instrumentId] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function handleDelete() {
    if (!removing) return;
    setDeleting(true);
    try {
      await deleteInstrumentCalibrationPoint(instrumentId, removing.id);
      notify("success", "Ponto removido.");
      setRemoving(null);
      queryClient.invalidateQueries({ queryKey: ["instrument-calibration-points", instrumentId] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-navy-900">Pontos de calibracao</h2>
          <p className="mt-1 text-xs text-graphite-500">
            Use quando este ativo tem mais de um ponto calibravel (ex.: varios PT-100 na mesma extrusora), cada um com seu proprio vencimento.
          </p>
        </div>
        {canEdit && (
          <button className="btn-ghost btn-sm shrink-0" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Novo ponto
          </button>
        )}
      </div>

      {isLoading ? null : !points || points.length === 0 ? (
        <EmptyState
          title="Nenhum ponto cadastrado"
          description="Sem pontos cadastrados, o proprio ativo e' tratado como um unico ponto de calibracao."
        />
      ) : (
        <ul className="divide-y divide-gray-100">
          {points.map((p) => {
            const extras = resumoDosCamposExtras(p);
            return (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-graphite-800">
                    {p.label}
                    {(p.measurementType || p.sensorType) && (
                      <span className="ml-2 text-xs font-normal text-graphite-400">
                        {[p.measurementType?.name, p.sensorType?.name].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-graphite-400">
                    {[p.measurementRange, p.unit].filter(Boolean).join(" ") || "Sem faixa definida"}
                    {extras ? ` · ${extras}` : ""}
                    {" · "}Proxima calibracao: {formatDate(p.nextDueDate)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusBadge status={p.derivedStatus ?? "VALID"} />
                  {canEdit && (
                    <>
                      <button type="button" className="text-graphite-400 hover:text-navy-700" aria-label="Editar ponto" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" className="text-graphite-400 hover:text-safety-red" aria-label="Remover ponto" onClick={() => setRemoving(p)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Editar ponto de calibracao" : "Novo ponto de calibracao"}
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setFormOpen(false)}>Cancelar</button>
            <button type="submit" form="instrument-calibration-point-form" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </button>
          </>
        }
      >
        <form id="instrument-calibration-point-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <TextInput
            label="Nome do ponto"
            required
            placeholder="Ex.: PT-100 - Zona 1 Canhao"
            error={errors.label?.message}
            {...register("label")}
          />

          <SelectInput
            label="Grandeza"
            placeholder="Nao especificar"
            hint="Preenche a unidade sozinho e abre os campos especificos dessa grandeza."
            options={(measurementTypes ?? []).map((t) => ({ value: t.id, label: t.name }))}
            value={measurementTypeId ?? ""}
            onChange={(e) => onMeasurementTypeChange(e.target.value)}
          />

          {measurementTypeId && (
            <SelectInput
              label="Tipo de sensor"
              placeholder="Nao especificar"
              hint="Tecnologia do sensor (ex.: PT100, Termopar tipo K) - descreve o principio de medicao no certificado."
              options={(sensorTypes ?? []).map((t) => ({ value: t.id, label: t.name }))}
              value={sensorTypeId ?? ""}
              onChange={(e) => setValue("sensorTypeId", e.target.value)}
            />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Faixa de medicao" placeholder="Ex.: 0 a 300" {...register("measurementRange")} />
            <TextInput label="Unidade" placeholder="Ex.: °C" {...register("unit")} />
          </div>

          {fieldProfile === "TEMPERATURE" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label="Temperatura a ser calibrada" type="number" step="any" {...register("targetTemperature")} />
              <TextInput label="Tolerancia (%)" type="number" step="any" {...register("tolerancePercent")} />
            </div>
          )}

          {fieldProfile === "SCALE" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label="Zero" type="number" step="any" {...register("zeroValue")} />
              <TextInput label="Span" type="number" step="any" {...register("spanValue")} />
            </div>
          )}

          <TextInput
            label="Periodicidade (meses)"
            type="number"
            hint="Ja vem da periodicidade do ativo - mude aqui se este ponto precisar de um ciclo proprio."
            {...register("calibrationFrequencyMonths")}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!removing}
        title="Remover ponto de calibracao"
        description={`Tem certeza que deseja remover "${removing?.label}"? Certificados que ja o calibraram mantem o historico.`}
        confirmLabel="Remover"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}
