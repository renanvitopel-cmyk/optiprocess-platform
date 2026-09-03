import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "../../../components/PageHeader";
import { TextInput, TextareaInput, SelectInput, CheckboxInput } from "../../../components/form/Field";
import { ClientPicker } from "../../../components/ClientPicker";
import { InstrumentPicker } from "../../../components/InstrumentPicker";
import { listAreas } from "../../../api/areas";
import { listServiceRequestCategories } from "../../../api/serviceRequestCategories";
import { createServiceRequest } from "../../../api/serviceRequests";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";
import { useCmms } from "../../../lib/cmms";

const schema = z.object({
  clientId: z.string().uuid("Selecione o cliente."),
  areaId: z.string().uuid().optional().or(z.literal("")),
  instrumentId: z.string().uuid().optional().or(z.literal("")),
  location: z.string().optional(),
  categoryId: z.string().uuid().optional().or(z.literal("")),
  description: z.string().min(2, "Descreva o problema."),
  safetyImpact: z.boolean().optional(),
  qualityImpact: z.boolean().optional(),
  productionImpact: z.boolean().optional(),
  suggestedPriority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
});
type FormValues = z.infer<typeof schema>;

/** Porta de entrada simples do CMMS: qualquer um (operador, solicitante, cliente)
 * relata uma necessidade de manutencao, sem precisar montar uma OS completa - isso
 * fica com a equipe na triagem. */
export default function ServiceRequestForm() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const { isClient, ownClientId, base } = useCmms();

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { clientId: ownClientId ?? "", suggestedPriority: "MEDIUM" },
  });
  const clientId = watch("clientId");

  const { data: areas } = useQuery({
    queryKey: ["areas-picker", clientId],
    queryFn: () => listAreas({ clientId, active: true }),
    enabled: !!clientId,
  });
  const { data: categories } = useQuery({
    queryKey: ["service-request-categories-picker"],
    queryFn: () => listServiceRequestCategories({ active: true }),
  });

  async function onSubmit(values: FormValues) {
    try {
      const payload = {
        ...values,
        areaId: values.areaId || null,
        instrumentId: values.instrumentId || null,
        categoryId: values.categoryId || null,
      };
      const saved = await createServiceRequest(payload);
      notify("success", `Solicitacao ${saved.number} aberta.`);
      navigate(`${base}/solicitacoes/${saved.id}`);
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  return (
    <div>
      <PageHeader
        title="Nova solicitacao de servico"
        description="Relate uma necessidade de manutencao - a equipe faz a triagem e gera a OS quando aprovada."
        breadcrumbs={[
          { label: "RLP Maintenance CMMS", to: base },
          { label: "Solicitacoes de servico", to: `${base}/solicitacoes` },
          { label: "Nova" },
        ]}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <div className="card space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {isClient ? (
              <input type="hidden" {...register("clientId")} />
            ) : (
              <ClientPicker required error={errors.clientId?.message} {...register("clientId")} />
            )}
            <SelectInput
              label="Area (opcional)"
              placeholder="Selecione"
              options={(areas ?? []).map((a) => ({ value: a.id, label: a.name }))}
              {...register("areaId")}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <InstrumentPicker label="Ativo (opcional)" clientId={clientId} error={errors.instrumentId?.message} {...register("instrumentId")} />
            <SelectInput
              label="Categoria (opcional)"
              placeholder="Selecione"
              options={(categories ?? []).map((c) => ({ value: c.id, label: c.name }))}
              {...register("categoryId")}
            />
          </div>
          <TextInput label="Local (opcional)" placeholder="Ex.: proximo a entrada da linha 2" {...register("location")} />
          <TextareaInput label="Descricao do problema" required rows={4} error={errors.description?.message} {...register("description")} />
          <SelectInput
            label="Prioridade sugerida"
            hint="A equipe pode ajustar na triagem."
            options={[
              { value: "LOW", label: "Baixa" },
              { value: "MEDIUM", label: "Media" },
              { value: "HIGH", label: "Alta" },
              { value: "CRITICAL", label: "Critica" },
            ]}
            {...register("suggestedPriority")}
          />
          <div>
            <p className="field-label">Impacto percebido</p>
            <div className="mt-2 flex flex-wrap gap-4">
              <CheckboxInput label="Seguranca" {...register("safetyImpact")} />
              <CheckboxInput label="Qualidade" {...register("qualityImpact")} />
              <CheckboxInput label="Producao" {...register("productionImpact")} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" className="btn-outline" onClick={() => navigate(-1)}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Enviando..." : "Abrir solicitacao"}
          </button>
        </div>
      </form>
    </div>
  );
}
