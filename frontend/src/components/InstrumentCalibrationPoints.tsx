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
import type { InstrumentCalibrationPoint } from "../api/types";
import { Modal } from "./Modal";
import { TextInput } from "./form/Field";
import { StatusBadge } from "./StatusBadge";
import { EmptyState } from "./EmptyState";
import { ConfirmDialog } from "./ConfirmDialog";
import { useToast } from "./Toast";
import { getApiErrorMessage } from "../api/client";
import { formatDate } from "../lib/format";

const schema = z.object({
  label: z.string().min(1, "Informe o nome do ponto."),
  measurementRange: z.string().optional(),
  unit: z.string().optional(),
  calibrationFrequencyMonths: z.coerce.number().int().min(1).optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

/** Pontos calibraveis dentro de um ativo maior - ex.: os 10 PT-100 de uma extrusora.
 * Cada ponto tem seu proprio ciclo de calibracao, independente dos outros e do ativo
 * como um todo; e' o que o formulario de nova calibracao usa para pre-preencher a
 * tabela de pontos em vez de comecar em branco. */
export function InstrumentCalibrationPoints({ instrumentId, canEdit }: { instrumentId: string; canEdit: boolean }) {
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

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  function openCreate() {
    reset({ label: "", measurementRange: "", unit: "", calibrationFrequencyMonths: "" });
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(point: InstrumentCalibrationPoint) {
    reset({
      label: point.label,
      measurementRange: point.measurementRange ?? "",
      unit: point.unit ?? "",
      calibrationFrequencyMonths: point.calibrationFrequencyMonths ?? "",
    });
    setEditing(point);
    setFormOpen(true);
  }

  async function onSubmit(values: FormValues) {
    try {
      const payload = {
        label: values.label,
        measurementRange: values.measurementRange || null,
        unit: values.unit || null,
        calibrationFrequencyMonths: values.calibrationFrequencyMonths || null,
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
          {points.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-graphite-800">{p.label}</p>
                <p className="text-xs text-graphite-400">
                  {[p.measurementRange, p.unit].filter(Boolean).join(" ") || "Sem faixa definida"}
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
          ))}
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
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Faixa de medicao" placeholder="Ex.: 0 a 300" {...register("measurementRange")} />
            <TextInput label="Unidade" placeholder="Ex.: °C" {...register("unit")} />
          </div>
          <TextInput
            label="Periodicidade (meses)"
            type="number"
            hint="Opcional. Sem valor, usa a periodicidade do ativo."
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
