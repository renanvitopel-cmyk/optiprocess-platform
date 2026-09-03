import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "../../../components/Modal";
import { TextInput, SelectInput } from "../../../components/form/Field";
import { ClientPicker } from "../../../components/ClientPicker";
import { InstrumentPicker } from "../../../components/InstrumentPicker";
import { createInstrument, updateInstrument } from "../../../api/instruments";
import type { Instrument } from "../../../api/types";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";

const schema = z.object({
  clientId: z.string().uuid("Selecione o cliente."),
  type: z.string().min(2, "Informe o tipo de instrumento."),
  tag: z.string().min(1, "Informe o TAG do ativo."),
  manufacturer: z.string().min(1, "Informe o fabricante."),
  model: z.string().min(1, "Informe o modelo."),
  serialNumber: z.string().min(1, "Informe o numero de serie."),
  measurementRange: z.string().optional(),
  resolution: z.string().optional(),
  unit: z.string().optional(),
  installationLocation: z.string().optional(),
  calibrationFrequencyMonths: z.coerce.number().int().min(1).optional().or(z.literal("")),
  lastCalibrationDate: z.string().optional(),
  status: z.enum(["VALID", "DUE_SOON", "EXPIRED", "IN_MAINTENANCE"]).optional(),
  criticality: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  parentId: z.string().uuid().optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (instrument: Instrument) => void;
  instrument?: Instrument;
  /** Pre-preenche o ativo pai e o cliente quando aberto a partir de "Adicionar filho" na ficha do pai. */
  initialParentId?: string;
  initialClientId?: string;
}

export function InstrumentFormModal({ open, onClose, onSaved, instrument, initialParentId, initialClientId }: Props) {
  const { notify } = useToast();
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });
  const clientId = watch("clientId");

  useEffect(() => {
    if (open) {
      reset(
        instrument
          ? {
              clientId: instrument.clientId,
              type: instrument.type,
              tag: instrument.tag ?? "",
              manufacturer: instrument.manufacturer,
              model: instrument.model,
              serialNumber: instrument.serialNumber,
              measurementRange: instrument.measurementRange ?? "",
              resolution: instrument.resolution ?? "",
              unit: instrument.unit ?? "",
              installationLocation: instrument.installationLocation ?? "",
              calibrationFrequencyMonths: instrument.calibrationFrequencyMonths ?? undefined,
              lastCalibrationDate: instrument.lastCalibrationDate?.slice(0, 10) ?? "",
              status: instrument.status,
              criticality: instrument.criticality,
              parentId: instrument.parentId ?? "",
            }
          : { criticality: "MEDIUM", parentId: initialParentId ?? "", clientId: initialClientId ?? "" },
      );
    }
  }, [open, instrument, initialParentId, initialClientId, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const payload = { ...values, parentId: values.parentId || null, calibrationFrequencyMonths: values.calibrationFrequencyMonths || null };
      const saved = instrument ? await updateInstrument(instrument.id, payload) : await createInstrument(payload);
      notify("success", instrument ? "Ativo atualizado." : "Ativo cadastrado.");
      onSaved(saved);
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={instrument ? "Editar ativo" : "Novo ativo"} size="lg" footer={
      <>
        <button type="button" className="btn-outline" onClick={onClose}>Cancelar</button>
        <button type="submit" form="instrument-form" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar"}
        </button>
      </>
    }>
      <form id="instrument-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <ClientPicker required error={errors.clientId?.message} {...register("clientId")} />
        <div className="rounded-lg border border-navy-200 bg-navy-50 p-4">
          <TextInput
            label="TAG do ativo"
            required
            hint="Codigo que identifica este ativo (definido pelo cliente ou pela OptiProcess). Todas as calibracoes e ordens de servico deste equipamento ficam agrupadas por este TAG."
            error={errors.tag?.message}
            {...register("tag")}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Tipo de ativo" required error={errors.type?.message} {...register("type")} />
          <SelectInput
            label="Criticidade"
            hint="Quanto uma parada deste ativo pesa pra empresa - guia prioridade de OS e estoque de pecas."
            options={[
              { value: "LOW", label: "Baixa" },
              { value: "MEDIUM", label: "Media" },
              { value: "HIGH", label: "Alta" },
              { value: "CRITICAL", label: "Critica" },
            ]}
            {...register("criticality")}
          />
        </div>
        <InstrumentPicker
          label="Ativo pai (opcional)"
          clientId={clientId}
          excludeId={instrument?.id}
          error={errors.parentId?.message}
          {...register("parentId")}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <TextInput label="Fabricante" required error={errors.manufacturer?.message} {...register("manufacturer")} />
          <TextInput label="Modelo" required error={errors.model?.message} {...register("model")} />
          <TextInput label="Numero de serie" required error={errors.serialNumber?.message} {...register("serialNumber")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextInput label="Faixa de medicao" {...register("measurementRange")} />
          <TextInput label="Resolucao" {...register("resolution")} />
          <TextInput label="Unidade" {...register("unit")} />
        </div>
        <TextInput label="Local de instalacao" {...register("installationLocation")} />
        <div className="grid gap-4 sm:grid-cols-3">
          <TextInput
            label="Periodicidade de calibracao (meses)"
            type="number"
            hint="Deixe em branco se este ativo nao tem calibracao periodica rastreada (ex.: um ativo so de manutencao/CMMS)."
            error={errors.calibrationFrequencyMonths?.message}
            {...register("calibrationFrequencyMonths")}
          />
          <TextInput label="Ultima calibracao" type="date" {...register("lastCalibrationDate")} />
          {instrument && (
            <SelectInput
              label="Status"
              options={[
                { value: "VALID", label: "Valido" },
                { value: "DUE_SOON", label: "Proximo do vencimento" },
                { value: "EXPIRED", label: "Vencido" },
                { value: "IN_MAINTENANCE", label: "Em manutencao" },
              ]}
              {...register("status")}
            />
          )}
        </div>
      </form>
    </Modal>
  );
}
