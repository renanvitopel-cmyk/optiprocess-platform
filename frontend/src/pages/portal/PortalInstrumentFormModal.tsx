import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "../../components/Modal";
import { TextInput, SelectInput } from "../../components/form/Field";
import { InstrumentPicker } from "../../components/InstrumentPicker";
import { AssetTypeInput } from "../../components/AssetTypeInput";
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
  calibrationFrequencyMonths: z.coerce.number().int().min(1).optional().or(z.literal("")),
  criticality: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
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
  /** Sugestao de TAG (ex.: "F01-RMP-") a partir do TAG do pai - so um valor inicial, o campo continua livre pra editar/apagar. */
  initialTagPrefix?: string;
}

/** Cadastro de ativo pelo proprio cliente no portal - sem escolha de empresa (o backend
 * sempre grava para a empresa do usuario logado) e so com os campos essenciais. */
export function PortalInstrumentFormModal({ open, onClose, onSaved, instrument, initialParentId, initialTagPrefix }: Props) {
  const { notify } = useToast();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
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
              calibrationFrequencyMonths: instrument.calibrationFrequencyMonths ?? undefined,
              criticality: instrument.criticality,
              parentId: instrument.parentId ?? "",
            }
          : { criticality: "MEDIUM", parentId: initialParentId ?? "", tag: initialTagPrefix ?? "" },
      );
    }
  }, [open, instrument, initialParentId, initialTagPrefix, reset]);

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
        <div className="grid gap-4 sm:grid-cols-2">
          <AssetTypeInput required currentValue={instrument?.type} error={errors.type?.message} {...register("type")} />
          <SelectInput
            label="Criticidade"
            hint="Quanto uma parada deste ativo pesa pra sua operacao."
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
          hint="Deixe em branco se este ativo nao precisa de calibracao periodica."
          error={errors.calibrationFrequencyMonths?.message}
          {...register("calibrationFrequencyMonths")}
        />
      </form>
    </Modal>
  );
}
