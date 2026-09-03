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

const schema = z
  .object({
    name: z.string().min(1, "Informe o nome do medidor."),
    unit: z.string().min(1, "Informe a unidade."),
    currentValue: z.coerce.number().nonnegative().optional(),
    minThreshold: z.coerce.number().optional().or(z.literal("")),
    maxThreshold: z.coerce.number().optional().or(z.literal("")),
  })
  .refine((v) => v.minThreshold === "" || v.maxThreshold === "" || v.minThreshold! <= v.maxThreshold!, {
    message: "O limite minimo nao pode ser maior que o maximo.",
    path: ["maxThreshold"],
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
    if (open) reset({ name: "", unit: "", currentValue: 0, minThreshold: "", maxThreshold: "" });
  }, [open, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const meter = await createMeter({
        ...values,
        instrumentId,
        minThreshold: values.minThreshold === "" ? null : values.minThreshold,
        maxThreshold: values.maxThreshold === "" ? null : values.maxThreshold,
      });
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
        <TextInput label="Nome" required placeholder="Ex.: Horimetro, Vibracao do mancal" error={errors.name?.message} {...register("name")} />
        <TextInput label="Unidade" required placeholder="Ex.: h, km, ciclos, mm/s, °C" error={errors.unit?.message} {...register("unit")} />
        <TextInput label="Leitura atual" type="number" step="any" {...register("currentValue")} />
        <div className="rounded-lg border border-navy-200 bg-navy-50 p-4">
          <p className="mb-3 text-xs text-graphite-600">
            Faixa normal de operacao (opcional). Uma leitura fora dela abre sozinha uma OS de manutencao preditiva.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Limite minimo" type="number" step="any" error={errors.minThreshold?.message} {...register("minThreshold")} />
            <TextInput label="Limite maximo" type="number" step="any" error={errors.maxThreshold?.message} {...register("maxThreshold")} />
          </div>
        </div>
      </form>
    </Modal>
  );
}
