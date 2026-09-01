import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "../../../components/Modal";
import { TextInput, TextareaInput, SelectInput } from "../../../components/form/Field";
import { ClientPicker } from "../../../components/ClientPicker";
import { UserPicker } from "../../../components/UserPicker";
import { createTechnicalReport, updateTechnicalReport } from "../../../api/technicalReports";
import type { TechnicalReport } from "../../../api/types";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";

const schema = z.object({
  category: z.enum(["ELECTRICAL_INSTALLATION", "THERMOGRAPHY", "GROUNDING", "SPDA", "OTHER"]),
  clientId: z.string().uuid("Selecione o cliente."),
  location: z.string().min(1, "Informe o local."),
  responsibleId: z.string().uuid("Selecione o responsavel."),
  reportDate: z.string().min(1, "Informe a data."),
  validUntil: z.string().optional(),
  observations: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (report: TechnicalReport) => void;
  report?: TechnicalReport;
}

export function TechnicalReportFormModal({ open, onClose, onSaved, report }: Props) {
  const { notify } = useToast();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      reset(
        report
          ? {
              category: report.category,
              clientId: report.clientId,
              location: report.location,
              responsibleId: report.responsibleId,
              reportDate: report.reportDate.slice(0, 10),
              validUntil: report.validUntil?.slice(0, 10) ?? "",
              observations: report.observations ?? "",
            }
          : undefined,
      );
    }
  }, [open, report, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const saved = report ? await updateTechnicalReport(report.id, values) : await createTechnicalReport(values);
      notify("success", report ? "Laudo atualizado." : "Laudo cadastrado.");
      onSaved(saved);
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={report ? "Editar laudo" : "Novo laudo tecnico"} footer={
      <>
        <button type="button" className="btn-outline" onClick={onClose}>Cancelar</button>
        <button type="submit" form="report-form" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar"}
        </button>
      </>
    }>
      <form id="report-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <SelectInput
          label="Categoria"
          required
          options={[
            { value: "ELECTRICAL_INSTALLATION", label: "Instalacoes eletricas" },
            { value: "THERMOGRAPHY", label: "Termografia infravermelha" },
            { value: "GROUNDING", label: "Aterramento eletrico" },
            { value: "SPDA", label: "SPDA (para-raios)" },
            { value: "OTHER", label: "Outros" },
          ]}
          error={errors.category?.message}
          {...register("category")}
        />
        <ClientPicker required error={errors.clientId?.message} {...register("clientId")} />
        <TextInput label="Local" required error={errors.location?.message} {...register("location")} />
        <UserPicker label="Responsavel tecnico" roles={["ADMIN", "TECHNICIAN"]} required error={errors.responsibleId?.message} {...register("responsibleId")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Data do laudo" type="date" required error={errors.reportDate?.message} {...register("reportDate")} />
          <TextInput label="Validade" type="date" {...register("validUntil")} />
        </div>
        <TextareaInput label="Observacoes" rows={3} {...register("observations")} />
      </form>
    </Modal>
  );
}
