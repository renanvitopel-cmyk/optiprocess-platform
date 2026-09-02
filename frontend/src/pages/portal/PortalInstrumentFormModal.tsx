import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "../../components/Modal";
import { TextInput } from "../../components/form/Field";
import { InstrumentPicker } from "../../components/InstrumentPicker";
import { createInstrument, updateInstrument } from "../../api/instruments";
import type { Instrument } from "../../api/types";
import { useToast } from "../../components/Toast";
import { getApiErrorMessage } from "../../api/client";

const schema = z.object({
  type: z.string().min(2, "Informe o tipo de equipamento."),
  tag: z.string().min(1, "Informe o TAG do ativo."),
  manufacturer: z.string().min(1, "Informe o fabricante."),
  model: z.string().min(1, "Informe o modelo."),
  serialNumber: z.string().min(1, "Informe o numero de serie."),
  installationLocation: z.string().optional(),
  calibrationFrequencyMonths: z.coerce.number().int().min(1, "Informe a periodicidade."),
  parentId: z.string().uuid().optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (instrument: Instrument) => void;
  instrument?: Instrument;
  /** Pre-preenche o ativo pai quando aberto pelo "Adicionar componente" da ficha do pai. */
  initialParentId?: string;
}

/** Cadastro de ativo pelo proprio cliente no portal - sem escolha de empresa (o backend
 * sempre grava para a empresa do usuario logado) e so com os campos essenciais. */
export function PortalInstrumentFormModal({ open, onClose, onSaved, instrument, initialParentId }: Props) {
  const { notify } = useToast();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { calibrationFrequencyMonths: 12 },
  });

  useEffect(() => {
    if (open) {
      reset(
        instrument
          ? {
              type: instrument.type,
              tag: instrument.tag ?? "",
              manufacturer: instrument.manufacturer,
              model: instrument.model,
              serialNumber: instrument.serialNumber,
              installationLocation: instrument.installationLocation ?? "",
              calibrationFrequencyMonths: instrument.calibrationFrequencyMonths,
              parentId: instrument.parentId ?? "",
            }
          : { calibrationFrequencyMonths: 12, parentId: initialParentId ?? "" },
      );
    }
  }, [open, instrument, initialParentId, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const payload = { ...values, parentId: values.parentId || null };
      const saved = instrument ? await updateInstrument(instrument.id, payload) : await createInstrument(payload);
      notify("success", instrument ? "Ativo atualizado." : "Ativo cadastrado.");
      onSaved(saved);
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={instrument ? "Editar ativo" : "Novo ativo"}
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose}>Cancelar</button>
          <button type="submit" form="portal-instrument-form" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar"}
          </button>
        </>
      }
    >
      <form id="portal-instrument-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="rounded-lg border border-navy-200 bg-navy-50 p-4">
          <TextInput
            label="TAG do ativo"
            required
            hint="Codigo que voce usa para identificar este equipamento. As calibracoes e ordens de servico ficam agrupadas por ele."
            error={errors.tag?.message}
            {...register("tag")}
          />
        </div>
        <TextInput label="Tipo de ativo" required error={errors.type?.message} {...register("type")} />
        <InstrumentPicker
          label="Ativo pai (opcional)"
          hint="Use para montar a arvore de ativos: o motor e' filho do compressor, a bomba e' filha da linha."
          excludeId={instrument?.id}
          error={errors.parentId?.message}
          {...register("parentId")}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <TextInput label="Fabricante" required error={errors.manufacturer?.message} {...register("manufacturer")} />
          <TextInput label="Modelo" required error={errors.model?.message} {...register("model")} />
          <TextInput label="Numero de serie" required error={errors.serialNumber?.message} {...register("serialNumber")} />
        </div>
        <TextInput label="Local de instalacao" {...register("installationLocation")} />
        <TextInput
          label="Periodicidade de calibracao (meses)"
          type="number"
          required
          error={errors.calibrationFrequencyMonths?.message}
          {...register("calibrationFrequencyMonths")}
        />
      </form>
    </Modal>
  );
}
