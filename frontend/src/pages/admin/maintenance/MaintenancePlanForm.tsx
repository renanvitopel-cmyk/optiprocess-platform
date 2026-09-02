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
import { listMeters } from "../../../api/meters";
import { createMaintenancePlan, getMaintenancePlan, updateMaintenancePlan } from "../../../api/maintenancePlans";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";
import { FullPageSpinner } from "../../../components/Spinner";
import { useCmms } from "../../../lib/cmms";

const schema = z.object({
  clientId: z.string().uuid("Selecione o cliente."),
  instrumentId: z.string().uuid("Selecione o ativo."),
  name: z.string().min(2, "Informe o nome do plano."),
  description: z.string().optional(),
  triggerType: z.enum(["TIME", "METER"]),
  frequencyDays: z.coerce.number().int().positive().optional(),
  meterId: z.string().uuid().optional().or(z.literal("")),
  meterInterval: z.coerce.number().positive().optional(),
  responsibleId: z.string().uuid().optional().or(z.literal("")),
  active: z.boolean().optional(),
  checklistTemplate: z.array(z.object({ description: z.string().min(1, "Descreva o item.") })),
});
type FormValues = z.infer<typeof schema>;

export default function MaintenancePlanForm() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { isClient, ownClientId, base } = useCmms();
  const isEdit = !!id;

  const { data: existing, isLoading } = useQuery({
    queryKey: ["maintenance-plan", id],
    queryFn: () => getMaintenancePlan(id!),
    enabled: isEdit,
  });

  const { register, control, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientId: ownClientId ?? searchParams.get("clientId") ?? "",
      instrumentId: searchParams.get("instrumentId") ?? "",
      triggerType: "TIME",
      active: true,
      checklistTemplate: [{ description: "" }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "checklistTemplate" });
  const clientId = watch("clientId");
  const instrumentId = watch("instrumentId");
  const triggerType = watch("triggerType");

  const { data: meters } = useQuery({
    queryKey: ["meters-picker", instrumentId],
    queryFn: () => listMeters({ instrumentId }),
    enabled: !!instrumentId && triggerType === "METER",
  });

  useEffect(() => {
    if (existing) {
      reset({
        clientId: existing.clientId,
        instrumentId: existing.instrumentId,
        name: existing.name,
        description: existing.description ?? "",
        triggerType: existing.triggerType,
        frequencyDays: existing.frequencyDays ?? undefined,
        meterId: existing.meterId ?? "",
        meterInterval: existing.meterInterval ?? undefined,
        responsibleId: existing.responsibleId ?? "",
        active: existing.active,
        checklistTemplate: existing.checklistTemplate.length ? existing.checklistTemplate : [{ description: "" }],
      });
    }
  }, [existing, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const payload = {
        ...values,
        meterId: values.meterId || null,
        responsibleId: values.responsibleId || null,
        checklistTemplate: values.checklistTemplate.filter((c) => c.description.trim()),
      };
      const saved = isEdit ? await updateMaintenancePlan(id!, payload) : await createMaintenancePlan(payload);
      notify("success", isEdit ? "Plano atualizado." : "Plano criado.");
      navigate(`${base}/planos/${saved.id}`);
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  if (isEdit && isLoading) return <FullPageSpinner />;

  return (
    <div>
      <PageHeader
        title={isEdit ? "Editar plano de manutencao" : "Novo plano de manutencao"}
        breadcrumbs={[
          { label: "RLP Maintenance CMMS", to: base },
          { label: "Planos", to: `${base}/planos` },
          { label: isEdit ? "Editar" : "Novo" },
        ]}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <div className="card space-y-4 p-5">
          <h2 className="font-semibold text-navy-900">Identificacao</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {isClient ? (
              <input type="hidden" {...register("clientId")} />
            ) : (
              <ClientPicker required error={errors.clientId?.message} {...register("clientId")} />
            )}
            <InstrumentPicker clientId={clientId} required error={errors.instrumentId?.message} {...register("instrumentId")} />
          </div>
          <TextInput label="Nome do plano" required placeholder="Ex.: Manutencao preventiva mensal" error={errors.name?.message} {...register("name")} />
          <TextareaInput label="Descricao (opcional)" rows={2} {...register("description")} />
          {!isClient && (
            <UserPicker label="Responsavel" roles={["ADMIN", "TECHNICIAN"]} error={errors.responsibleId?.message} {...register("responsibleId")} />
          )}
        </div>

        <div className="card space-y-4 p-5">
          <h2 className="font-semibold text-navy-900">Disparo da manutencao</h2>
          <SelectInput
            label="Tipo de disparo"
            required
            options={[
              { value: "TIME", label: "Por tempo (periodicidade em dias)" },
              { value: "METER", label: "Por medidor (horimetro, odometro, etc.)" },
            ]}
            {...register("triggerType")}
          />
          {triggerType === "TIME" ? (
            <TextInput
              label="Periodicidade (dias)"
              type="number"
              required
              hint="Ex.: 30 para mensal, 7 para semanal."
              error={errors.frequencyDays?.message}
              {...register("frequencyDays")}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectInput
                label="Medidor"
                required
                placeholder={instrumentId ? "Selecione o medidor" : "Selecione o ativo primeiro"}
                disabled={!instrumentId}
                options={(meters ?? []).map((m) => ({ value: m.id, label: `${m.name} (${m.unit}) - atual: ${m.currentValue}` }))}
                error={errors.meterId?.message}
                {...register("meterId")}
              />
              <TextInput
                label="Intervalo"
                type="number"
                step="any"
                required
                hint="Gera nova OS a cada X unidades do medidor."
                error={errors.meterInterval?.message}
                {...register("meterInterval")}
              />
            </div>
          )}
        </div>

        <div className="card space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-navy-900">Checklist padrao</h2>
            <button type="button" className="btn-ghost btn-sm" onClick={() => append({ description: "" })}>
              <Plus className="h-4 w-4" /> Adicionar item
            </button>
          </div>
          <p className="text-xs text-graphite-500">Copiado para cada ordem de manutencao gerada a partir deste plano.</p>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <TextInput
                  className="flex-1"
                  placeholder={`Item ${index + 1}`}
                  error={errors.checklistTemplate?.[index]?.description?.message}
                  {...register(`checklistTemplate.${index}.description`)}
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
