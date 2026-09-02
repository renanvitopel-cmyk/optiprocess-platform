import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "../../../components/Modal";
import { TextInput } from "../../../components/form/Field";
import { createMeter } from "../../../api/meters";
import type { Meter } from "../../../api/types";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";

const schema = z.object({
  name: z.string().min(1, "Informe o nome do medidor."),
  unit: z.string().min(1, "Informe a unidade."),
  currentValue: z.coerce.number().nonnegative().optional(),
});
type FormValues = z.infer<typeof schema>;

export function MeterFormModal({
  open,
  onClose,
  onSaved,
  instrumentId,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (meter: Meter) => void;
  instrumentId: string;
}) {
  const { notify } = useToast();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) reset({ name: "", unit: "", currentValue: 0 });
  }, [open, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const meter = await createMeter({ ...values, instrumentId });
      notify("success", "Medidor cadastrado.");
      onSaved(meter);
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo medidor"
      size="sm"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose}>Cancelar</button>
          <button type="submit" form="meter-form" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar"}
          </button>
        </>
      }
    >
      <form id="meter-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <TextInput label="Nome" required placeholder="Ex.: Horimetro" error={errors.name?.message} {...register("name")} />
        <TextInput label="Unidade" required placeholder="Ex.: h, km, ciclos" error={errors.unit?.message} {...register("unit")} />
        <TextInput label="Leitura atual" type="number" step="any" {...register("currentValue")} />
      </form>
    </Modal>
  );
}
