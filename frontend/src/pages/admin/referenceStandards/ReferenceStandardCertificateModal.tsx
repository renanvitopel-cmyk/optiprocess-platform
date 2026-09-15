import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Paperclip } from "lucide-react";
import { Modal } from "../../../components/Modal";
import { TextInput, TextareaInput } from "../../../components/form/Field";
import { createReferenceStandardCertificate } from "../../../api/referenceStandards";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";

const schema = z.object({
  certificateNumber: z.string().optional(),
  laboratory: z.string().optional(),
  calibrationDate: z.string().min(1, "Informe a data da calibracao."),
  validUntil: z.string().min(1, "Informe a validade."),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  referenceStandardId: string;
}

/** Cada calibracao do proprio padrao gera um certificado novo neste historico - e' o
 * mais recente (por validade) que decide se o padrao esta "certificado" na ficha. */
export function ReferenceStandardCertificateModal({ open, onClose, onSaved, referenceStandardId }: Props) {
  const { notify } = useToast();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      setFile(null);
      reset({ certificateNumber: "", laboratory: "", calibrationDate: "", validUntil: "", notes: "" });
    }
  }, [open, reset]);

  async function onSubmit(values: FormValues) {
    try {
      await createReferenceStandardCertificate(referenceStandardId, { ...values, file });
      notify("success", "Certificado cadastrado.");
      onSaved();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo certificado"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose}>Cancelar</button>
          <button type="submit" form="reference-standard-certificate-form" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar"}
          </button>
        </>
      }
    >
      <form id="reference-standard-certificate-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Numero do certificado" {...register("certificateNumber")} />
          <TextInput label="Laboratorio" {...register("laboratory")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Data da calibracao"
            type="date"
            required
            error={errors.calibrationDate?.message}
            {...register("calibrationDate")}
          />
          <TextInput
            label="Validade"
            type="date"
            required
            hint="Normalmente 1 ano apos a calibracao."
            error={errors.validUntil?.message}
            {...register("validUntil")}
          />
        </div>
        <TextareaInput label="Observacoes" {...register("notes")} />

        <div>
          <label className="btn-outline inline-flex cursor-pointer items-center gap-2 text-sm">
            <Paperclip className="h-4 w-4" />
            {file ? file.name : "Anexar PDF do certificado"}
            <input
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <p className="mt-1 text-xs text-graphite-400">Opcional.</p>
        </div>
      </form>
    </Modal>
  );
}
