import { useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "../../../components/PageHeader";
import { TextInput, TextareaInput, SelectInput } from "../../../components/form/Field";
import { ClientPicker } from "../../../components/ClientPicker";
import { InstrumentPicker } from "../../../components/InstrumentPicker";
import { UserPicker } from "../../../components/UserPicker";
import { listFailureCodes } from "../../../api/failureCodes";
import { createMaintenanceWorkOrder, getMaintenanceWorkOrder, updateMaintenanceWorkOrder } from "../../../api/maintenanceWorkOrders";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";
import { FullPageSpinner } from "../../../components/Spinner";

const schema = z.object({
  clientId: z.string().uuid("Selecione o cliente."),
  instrumentId: z.string().uuid("Selecione o ativo."),
  type: z.enum(["PREVENTIVE", "CORRECTIVE", "PREDICTIVE"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  description: z.string().min(2, "Descreva o servico."),
  technicianId: z.string().uuid().optional().or(z.literal("")),
  scheduledDate: z.string().optional(),
  failureCodeId: z.string().uuid().optional().or(z.literal("")),
  laborHours: z.coerce.number().optional(),
  observations: z.string().optional(),
  checklist: z.array(z.object({ description: z.string().min(1, "Descreva o item.") })),
});
type FormValues = z.infer<typeof schema>;

export default function WorkOrderForm() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const isEdit = !!id;

  const { data: existing, isLoading } = useQuery({
    queryKey: ["maintenance-work-order", id],
    queryFn: () => getMaintenanceWorkOrder(id!),
    enabled: isEdit,
  });

  const { data: failureCodes } = useQuery({ queryKey: ["failure-codes-picker"], queryFn: () => listFailureCodes({ active: true }) });

  const { register, control, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientId: searchParams.get("clientId") ?? "",
      instrumentId: searchParams.get("instrumentId") ?? "",
      type: "CORRECTIVE",
      priority: "MEDIUM",
      checklist: [{ description: "" }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "checklist" });
  const clientId = watch("clientId");
  const type = watch("type");

  useEffect(() => {
    if (existing) {
      reset({
        clientId: existing.clientId,
        instrumentId: existing.instrumentId,
        type: existing.type,
        priority: existing.priority,
        description: existing.description,
        technicianId: existing.technicianId ?? "",
        scheduledDate: existing.scheduledDate?.slice(0, 10) ?? "",
        failureCodeId: existing.failureCodeId ?? "",
        laborHours: existing.laborHours ?? undefined,
        observations: existing.observations ?? "",
        checklist: existing.checklist?.length ? existing.checklist.map((c) => ({ description: c.description })) : [{ description: "" }],
      });
    }
  }, [existing, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const payload = {
        ...values,
        technicianId: values.technicianId || null,
        failureCodeId: values.failureCodeId || null,
        checklist: values.checklist.filter((c) => c.description.trim()),
      };
      const saved = isEdit ? await updateMaintenanceWorkOrder(id!, payload) : await createMaintenanceWorkOrder(payload);
      notify("success", isEdit ? "OS atualizada." : "OS criada.");
      navigate(`/gestao/manutencao/ordens/${saved.id}`);
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  if (isEdit && isLoading) return <FullPageSpinner />;

  return (
    <div>
      <PageHeader
        title={isEdit ? `Editar OS ${existing?.number ?? ""}` : "Nova ordem de manutencao"}
        breadcrumbs={[
          { label: "RLP Maintenance CMMS", to: "/gestao/manutencao" },
          { label: "Ordens", to: "/gestao/manutencao/ordens" },
          { label: isEdit ? "Editar" : "Nova" },
        ]}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <div className="card space-y-4 p-5">
          <h2 className="font-semibold text-navy-900">Identificacao</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <ClientPicker required error={errors.clientId?.message} {...register("clientId")} />
            <InstrumentPicker clientId={clientId} required error={errors.instrumentId?.message} {...register("instrumentId")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectInput
              label="Tipo"
              required
              options={[
                { value: "CORRECTIVE", label: "Corretiva" },
                { value: "PREVENTIVE", label: "Preventiva" },
                { value: "PREDICTIVE", label: "Preditiva" },
              ]}
              {...register("type")}
            />
            <SelectInput
              label="Prioridade"
              options={[
                { value: "LOW", label: "Baixa" },
                { value: "MEDIUM", label: "Media" },
                { value: "HIGH", label: "Alta" },
                { value: "CRITICAL", label: "Critica" },
              ]}
              {...register("priority")}
            />
            <UserPicker label="Tecnico responsavel" roles={["ADMIN", "TECHNICIAN"]} error={errors.technicianId?.message} {...register("technicianId")} />
          </div>
          <TextareaInput label="Descricao do servico" required rows={3} error={errors.description?.message} {...register("description")} />
          <div className="grid gap-4 sm:grid-cols-3">
            <TextInput label="Data agendada" type="date" {...register("scheduledDate")} />
            <TextInput label="Horas previstas" type="number" step="0.5" {...register("laborHours")} />
            {type === "CORRECTIVE" && (
              <SelectInput
                label="Codigo de falha"
                placeholder="Selecione a causa"
                options={(failureCodes ?? []).map((f) => ({ value: f.id, label: `${f.code} - ${f.description}` }))}
                {...register("failureCodeId")}
              />
            )}
          </div>
          <TextareaInput label="Observacoes (opcional)" rows={2} {...register("observations")} />
        </div>

        <div className="card space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-navy-900">Checklist de execucao</h2>
            <button type="button" className="btn-ghost btn-sm" onClick={() => append({ description: "" })}>
              <Plus className="h-4 w-4" /> Adicionar item
            </button>
          </div>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <TextInput
                  className="flex-1"
                  placeholder={`Item ${index + 1}`}
                  error={errors.checklist?.[index]?.description?.message}
                  {...register(`checklist.${index}.description`)}
                />
                {fields.length > 1 && (
                  <button type="button" onClick={() => remove(index)} className="text-graphite-400 hover:text-safety-red" aria-label="Remover item">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" className="btn-outline" onClick={() => navigate(-1)}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}
