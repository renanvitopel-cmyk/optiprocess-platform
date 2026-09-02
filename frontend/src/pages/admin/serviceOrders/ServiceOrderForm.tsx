import { useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "../../../components/PageHeader";
import { TextInput, TextareaInput, SelectInput } from "../../../components/form/Field";
import { ClientPicker } from "../../../components/ClientPicker";
import { InstrumentPicker } from "../../../components/InstrumentPicker";
import { UserPicker } from "../../../components/UserPicker";
import { createServiceOrder, getServiceOrder, updateServiceOrder } from "../../../api/serviceOrders";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";
import { FullPageSpinner } from "../../../components/Spinner";

const CATEGORY_OPTIONS = [
  { value: "ELECTRICAL_MAINTENANCE", label: "Manutencao eletrica" },
  { value: "PANEL_MAINTENANCE", label: "Manutencao de paineis" },
  { value: "MOTOR_MAINTENANCE", label: "Manutencao de motores" },
  { value: "TECHNICAL_REPORT", label: "Laudo tecnico" },
  { value: "CALIBRATION", label: "Calibracao" },
  { value: "TECHNICAL_ASSISTANCE", label: "Assistencia tecnica" },
  { value: "EV_CHARGER", label: "Carregador veicular" },
  { value: "OTHER", label: "Outros" },
];

const schema = z.object({
  clientId: z.string().uuid("Selecione o cliente."),
  instrumentId: z.string().uuid().optional().or(z.literal("")),
  siteAddress: z.string().min(2, "Informe o local de atendimento."),
  category: z.enum([
    "ELECTRICAL_MAINTENANCE",
    "PANEL_MAINTENANCE",
    "MOTOR_MAINTENANCE",
    "TECHNICAL_REPORT",
    "CALIBRATION",
    "TECHNICAL_ASSISTANCE",
    "EV_CHARGER",
    "OTHER",
  ]),
  description: z.string().min(2, "Descreva o servico."),
  technicianId: z.string().uuid().optional().or(z.literal("")),
  scheduledDate: z.string().optional(),
  deadline: z.string().optional(),
  laborHours: z.coerce.number().optional(),
  status: z.enum(["BUDGET", "APPROVED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELED"]),
});
type FormValues = z.infer<typeof schema>;

export default function ServiceOrderForm() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const isEdit = !!id;

  const { data: existing, isLoading } = useQuery({
    queryKey: ["service-order", id],
    queryFn: () => getServiceOrder(id!),
    enabled: isEdit,
  });

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientId: searchParams.get("clientId") ?? "",
      instrumentId: searchParams.get("instrumentId") ?? "",
      status: "BUDGET",
    },
  });
  const clientId = watch("clientId");

  useEffect(() => {
    if (existing) {
      reset({
        clientId: existing.clientId,
        instrumentId: existing.instrumentId ?? "",
        siteAddress: existing.siteAddress,
        category: existing.category,
        description: existing.description,
        technicianId: existing.technicianId ?? "",
        scheduledDate: existing.scheduledDate?.slice(0, 10) ?? "",
        deadline: existing.deadline?.slice(0, 10) ?? "",
        laborHours: existing.laborHours ?? undefined,
        status: existing.status,
      });
    }
  }, [existing, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const payload = { ...values, technicianId: values.technicianId || null, instrumentId: values.instrumentId || null };
      const saved = isEdit ? await updateServiceOrder(id!, payload) : await createServiceOrder(payload);
      notify("success", isEdit ? "OS atualizada." : "OS criada.");
      navigate(`/gestao/ordens-servico/${saved.id}`);
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  if (isEdit && isLoading) return <FullPageSpinner />;

  return (
    <div>
      <PageHeader
        title={isEdit ? `Editar OS ${existing?.number ?? ""}` : "Nova ordem de servico"}
        breadcrumbs={[{ label: "Ordens de servico", to: "/gestao/ordens-servico" }, { label: isEdit ? "Editar" : "Nova" }]}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="card max-w-3xl space-y-4 p-5" noValidate>
        <ClientPicker required error={errors.clientId?.message} {...register("clientId")} />
        <InstrumentPicker
          label="Ativo relacionado (opcional)"
          clientId={clientId}
          error={errors.instrumentId?.message}
          {...register("instrumentId")}
        />
        <TextInput label="Local de atendimento" required error={errors.siteAddress?.message} {...register("siteAddress")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectInput label="Tipo de servico" required options={CATEGORY_OPTIONS} error={errors.category?.message} {...register("category")} />
          <UserPicker label="Tecnico responsavel" roles={["ADMIN", "TECHNICIAN"]} error={errors.technicianId?.message} {...register("technicianId")} />
        </div>
        <TextareaInput label="Descricao do servico" required rows={4} error={errors.description?.message} {...register("description")} />
        <div className="grid gap-4 sm:grid-cols-3">
          <TextInput label="Data agendada" type="date" {...register("scheduledDate")} />
          <TextInput label="Prazo" type="date" {...register("deadline")} />
          <TextInput label="Horas trabalhadas" type="number" step="0.5" {...register("laborHours")} />
        </div>
        {isEdit && (
          <SelectInput
            label="Status"
            options={[
              { value: "BUDGET", label: "Orcamento" },
              { value: "APPROVED", label: "Aprovada" },
              { value: "SCHEDULED", label: "Agendada" },
              { value: "IN_PROGRESS", label: "Em andamento" },
              { value: "COMPLETED", label: "Concluida" },
              { value: "CANCELED", label: "Cancelada" },
            ]}
            {...register("status")}
          />
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-outline" onClick={() => navigate(-1)}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}
