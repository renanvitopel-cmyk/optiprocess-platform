import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "../../components/Modal";
import { TextInput, CheckboxInput } from "../../components/form/Field";
import { AssetTypeInput } from "../../components/AssetTypeInput";
import { createInstrument, updateInstrument } from "../../api/instruments";
import type { Instrument } from "../../api/types";
import { useToast } from "../../components/Toast";
import { getApiErrorMessage } from "../../api/client";

const schema = z.object({
  type: z.string().optional(),
  tag: z.string().min(1, "Informe o TAG do ativo."),
  description: z.string().min(2, "Informe a descricao do ativo."),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  installationLocation: z.string().optional(),
  calibratable: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (instrument: Instrument) => void;
  instrument?: Instrument;
}

/** Cadastro de ativo pelo proprio cliente no portal - sem escolha de empresa (o backend
 * sempre grava para a empresa do usuario logado) e so com os campos essenciais. */
export function PortalInstrumentFormModal({ open, onClose, onSaved, instrument }: Props) {
  const { notify } = useToast();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (open) {
      reset(
        instrument
          ? {
              type: instrument.type ?? "",
              tag: instrument.tag ?? "",
              description: instrument.description ?? "",
              manufacturer: instrument.manufacturer ?? "",
              model: instrument.model ?? "",
              serialNumber: instrument.serialNumber ?? "",
              installationLocation: instrument.installationLocation ?? "",
              calibratable: instrument.calibratable,
            }
          : { tag: "" },
      );
    }
  }, [open, instrument, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const payload = {
        ...values,
        description: values.description || null,
        manufacturer: values.manufacturer || null,
        model: values.model || null,
        serialNumber: values.serialNumber || null,
        type: values.type || undefined,
      };
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
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="TAG"
            required
            placeholder="Ex.: VTP-VOT-L4-CP01"
            hint="Codigo unico deste ativo na sua empresa."
            error={errors.tag?.message}
            {...register("tag")}
          />
          <TextInput
            label="Descricao"
            placeholder="Ex.: Compressor de ar da Linha 4"
            hint="Nome do ativo em linguagem de gente."
            {...register("description")}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <AssetTypeInput currentValue={instrument?.type} {...register("type")} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <TextInput label="Fabricante" {...register("manufacturer")} />
          <TextInput label="Modelo" {...register("model")} />
          <TextInput label="Numero de serie" {...register("serialNumber")} />
        </div>
        <TextInput label="Local de instalacao" {...register("installationLocation")} />

        <div className="space-y-3 rounded-lg border border-gray-200 p-4">
          <p className="text-sm font-medium text-graphite-700">Este ativo participa de</p>
          <CheckboxInput
            label="Calibracao - envia para a OptiProcess calibrar"
            {...register("calibratable")}
          />
          <p className="-mt-1 pl-6 text-xs text-graphite-500">
            Ao marcar, o ativo entra na lista de calibracao da OptiProcess. Depois e' preciso criar o plano de
            calibracao, que define de quanto em quanto tempo.
          </p>
        </div>
      </form>
    </Modal>
  );
}
