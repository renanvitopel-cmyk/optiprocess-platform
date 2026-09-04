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
import { listLaborResources } from "../../../api/laborResources";
import { getInstrument } from "../../../api/instruments";
import { createMaintenanceWorkOrder, getMaintenanceWorkOrder, updateMaintenanceWorkOrder } from "../../../api/maintenanceWorkOrders";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";
import { FullPageSpinner } from "../../../components/Spinner";
import { useCmms } from "../../../lib/cmms";
import { OPCOES_DE_TIPO, GRAVIDADES_DE_FALHA, valorDoTipo } from "../../../lib/maintenanceLabels";
import type { FailureSeverity } from "../../../api/types";

const schema = z.object({
  clientId: z.string().uuid("Selecione o cliente."),
  instrumentId: z.string().uuid("Selecione o ativo."),
  // Um seletor so, ja separando a corretiva em operacao da de quebra - o par (tipo,
  // tipo de corretiva) e' remontado no envio.
  tipoSelecionado: z.string().min(1, "Selecione o tipo de servico."),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  title: z.string().min(3, "Informe um titulo curto.").max(200),
  description: z.string().min(2, "Descreva o servico."),
  technicianId: z.string().uuid().optional().or(z.literal("")),
  assignedResourceId: z.string().uuid().optional().or(z.literal("")),
  scheduledDate: z.string().optional(),
  plannedStart: z.string().optional(),
  plannedEnd: z.string().optional(),
  estimatedHours: z.coerce.number().nonnegative().optional(),
  failureCodeId: z.string().uuid().optional().or(z.literal("")),
  observations: z.string().optional(),
  // Registro de falha (obrigatorio para concluir uma corretiva de quebra).
  failureStartedAt: z.string().optional(),
  failureEndedAt: z.string().optional(),
  failureSeverity: z.enum(["LOW", "MODERATE", "HIGH", "CRITICAL"]).optional().or(z.literal("")),
  failureDescription: z.string().optional(),
  failureRootCause: z.string().optional(),
  failureCorrectiveAction: z.string().optional(),
  productionLoss: z.coerce.number().nonnegative().optional(),
  checklist: z.array(
    z.object({
      description: z.string().min(1, "Descreva o item."),
      estimatedMinutes: z.coerce.number().int().nonnegative().optional().or(z.literal("")),
    }),
  ),
});
type FormValues = z.infer<typeof schema>;

export default function WorkOrderForm() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { isClient, ownClientId, base } = useCmms();
  const isEdit = !!id;

  const { data: existing, isLoading } = useQuery({
    queryKey: ["maintenance-work-order", id],
    queryFn: () => getMaintenanceWorkOrder(id!),
    enabled: isEdit,
  });

  const { data: failureCodes } = useQuery({ queryKey: ["failure-codes-picker"], queryFn: () => listFailureCodes({ active: true }) });

  const { register, control, handleSubmit, watch, reset, setValue, formState: { errors, isSubmitting, dirtyFields } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientId: ownClientId ?? searchParams.get("clientId") ?? "",
      instrumentId: searchParams.get("instrumentId") ?? "",
      tipoSelecionado: "CORRECTIVE_IN_OPERATION",
      priority: "MEDIUM",
      checklist: [{ description: "", estimatedMinutes: "" }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "checklist" });
  const clientId = watch("clientId");
  const tipoSelecionado = watch("tipoSelecionado");
  const opcaoDeTipo = OPCOES_DE_TIPO.find((o) => o.valor === tipoSelecionado);
  const ehCorretiva = opcaoDeTipo?.type === "CORRECTIVE";
  const ehQuebra = opcaoDeTipo?.correctiveType === "BREAKDOWN";
  const instrumentId = watch("instrumentId");

  // Equipe da propria empresa - e' quem de fato executa a OS no CMMS do cliente.
  const { data: laborResources } = useQuery({
    queryKey: ["labor-resources-picker", clientId],
    queryFn: () => listLaborResources({ clientId, active: true, pageSize: 200 }),
    enabled: !!clientId,
  });

  // Sugere a prioridade a partir da criticidade do ativo escolhido - o tecnico ainda
  // pode trocar (por isso so sobrescreve enquanto o campo nao foi tocado a mao).
  const { data: selectedInstrument } = useQuery({
    queryKey: ["instrument-for-priority", instrumentId],
    queryFn: () => getInstrument(instrumentId),
    enabled: !isEdit && !!instrumentId,
  });
  useEffect(() => {
    if (selectedInstrument && !dirtyFields.priority) {
      setValue("priority", selectedInstrument.criticality);
    }
  }, [selectedInstrument, dirtyFields.priority, setValue]);

  useEffect(() => {
    if (existing) {
      reset({
        clientId: existing.clientId,
        instrumentId: existing.instrumentId,
        tipoSelecionado: valorDoTipo(existing.type, existing.correctiveType),
        priority: existing.priority,
        title: existing.title ?? "",
        description: existing.description,
        technicianId: existing.technicianId ?? "",
        assignedResourceId: existing.assignedResourceId ?? "",
        scheduledDate: existing.scheduledDate?.slice(0, 10) ?? "",
        plannedStart: existing.plannedStart?.slice(0, 16) ?? "",
        plannedEnd: existing.plannedEnd?.slice(0, 16) ?? "",
        estimatedHours: existing.estimatedHours ?? undefined,
        failureCodeId: existing.failureCodeId ?? "",
        observations: existing.observations ?? "",
        failureStartedAt: existing.failureStartedAt?.slice(0, 16) ?? "",
        failureEndedAt: existing.failureEndedAt?.slice(0, 16) ?? "",
        failureSeverity: existing.failureSeverity ?? "",
        failureDescription: existing.failureDescription ?? "",
        failureRootCause: existing.failureRootCause ?? "",
        failureCorrectiveAction: existing.failureCorrectiveAction ?? "",
        productionLoss: existing.productionLoss ?? undefined,
        checklist: existing.checklist?.length
          ? existing.checklist.map((c) => ({ description: c.description, estimatedMinutes: c.estimatedMinutes ?? "" }))
          : [{ description: "", estimatedMinutes: "" }],
      });
    }
  }, [existing, reset]);

  async function onSubmit(values: FormValues) {
    try {
      // Os campos de falha saem do "resto" e voltam so quando a OS e' corretiva - senao
      // viajariam como "" numa preventiva.
      const {
        tipoSelecionado: escolha,
        failureStartedAt: _fs,
        failureEndedAt: _fe,
        failureSeverity: _sev,
        failureDescription: _fd,
        failureRootCause: _frc,
        failureCorrectiveAction: _fca,
        productionLoss: _pl,
        ...resto
      } = values;
      const opcao = OPCOES_DE_TIPO.find((o) => o.valor === escolha);
      // Campos de falha so viajam quando a OS e' corretiva - noutro tipo o backend recusa,
      // e com razao: nao descreveriam nada.
      const registroDeFalha = opcao?.type === "CORRECTIVE"
        ? {
            failureStartedAt: values.failureStartedAt || null,
            failureEndedAt: values.failureEndedAt || null,
            failureSeverity: (values.failureSeverity || null) as FailureSeverity | null,
            failureDescription: values.failureDescription || null,
            failureRootCause: values.failureRootCause || null,
            failureCorrectiveAction: values.failureCorrectiveAction || null,
            productionLoss: values.productionLoss ?? null,
          }
        : {};

      const payload = {
        ...resto,
        type: opcao!.type,
        correctiveType: opcao!.correctiveType,
        ...registroDeFalha,
        technicianId: values.technicianId || null,
        assignedResourceId: values.assignedResourceId || null,
        failureCodeId: values.failureCodeId || null,
        plannedStart: values.plannedStart || null,
        plannedEnd: values.plannedEnd || null,
        checklist: values.checklist
          .filter((c) => c.description.trim())
          .map((c) => ({ description: c.description, estimatedMinutes: c.estimatedMinutes === "" ? null : Number(c.estimatedMinutes) })),
      };
      const saved = isEdit ? await updateMaintenanceWorkOrder(id!, payload) : await createMaintenanceWorkOrder(payload);
      notify("success", isEdit ? "OS atualizada." : "OS criada.");
      navigate(`${base}/ordens/${saved.id}`);
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
          { label: "RLP Maintenance CMMS", to: base },
          { label: "Ordens", to: `${base}/ordens` },
          { label: isEdit ? "Editar" : "Nova" },
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
          {/* Titulo curto: e' o que aparece na lista de OS e no quadro de programacao. A
              descricao abaixo continua sendo o relato completo do sintoma/servico. */}
          <TextInput
            label="Titulo"
            required
            placeholder="Ex.: Troca do rolamento do mancal lado acoplamento"
            hint="Resumo em uma linha - e' o que aparece nas listas e na programacao."
            error={errors.title?.message}
            {...register("title")}
          />
          <div className={`grid gap-4 ${isClient ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
            <SelectInput
              label="Tipo de servico"
              required
              hint={ehQuebra ? "Quebra: o registro da falha e' obrigatorio para concluir." : undefined}
              options={OPCOES_DE_TIPO.map((o) => ({ value: o.valor, label: o.rotulo }))}
              error={errors.tipoSelecionado?.message}
              {...register("tipoSelecionado")}
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
            {!isClient && (
              <UserPicker label="Tecnico responsavel" roles={["ADMIN", "TECHNICIAN"]} error={errors.technicianId?.message} {...register("technicianId")} />
            )}
            <SelectInput
              label="Quem vai executar"
              placeholder={clientId ? "A definir na programacao" : "Selecione o cliente primeiro"}
              disabled={!clientId}
              hint="Equipe da empresa - tambem da para definir arrastando no quadro de programacao."
              options={(laborResources?.items ?? []).map((r) => ({ value: r.id, label: `${r.name} (${r.type})` }))}
              error={errors.assignedResourceId?.message}
              {...register("assignedResourceId")}
            />
          </div>
          <TextareaInput
            label="Descricao / sintoma"
            required
            rows={3}
            hint="O relato completo: o que foi observado ou o que precisa ser feito."
            error={errors.description?.message}
            {...register("description")}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            {ehCorretiva && (
              <SelectInput
                label="Categoria da falha"
                required={ehQuebra}
                placeholder="Selecione a causa"
                options={(failureCodes ?? []).map((f) => ({ value: f.id, label: `${f.code} - ${f.description}` }))}
                {...register("failureCodeId")}
              />
            )}
          </div>
          <TextareaInput label="Observacoes (opcional)" rows={2} {...register("observations")} />
        </div>

        {/* Registro de falha: aparece na corretiva, com destaque quando e' quebra - e' o que
            o backend vai cobrar para deixar concluir. Fica no proprio formulario (e nao
            escondido numa aba) porque e' preenchido junto com o atendimento. */}
        {ehCorretiva && (
          <div className={`card space-y-4 p-5 ${ehQuebra ? "border-2 border-safety-red/40" : ""}`}>
            <div>
              <h2 className="flex flex-wrap items-center gap-2 font-semibold text-navy-900">
                Registro da falha
                {ehQuebra ? (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-safety-red">
                    obrigatorio na corretiva de quebra
                  </span>
                ) : (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-graphite-500">opcional em operacao</span>
                )}
              </h2>
              <p className="text-xs text-graphite-500">
                Alimenta o Pareto de falhas e a tela de Falhas e RCA. O tempo parado e' calculado das datas.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <TextInput label="Inicio da falha" type="datetime-local" required={ehQuebra} {...register("failureStartedAt")} />
              <TextInput label="Termino da falha" type="datetime-local" required={ehQuebra} {...register("failureEndedAt")} />
              <SelectInput
                label="Gravidade"
                placeholder="Nao informada"
                required={ehQuebra}
                options={GRAVIDADES_DE_FALHA.map((g) => ({ value: g.valor, label: g.rotulo }))}
                {...register("failureSeverity")}
              />
              <TextInput
                label="Perda de producao"
                type="number"
                step="any"
                min="0"
                hint="Estimativa, na unidade da empresa."
                {...register("productionLoss")}
              />
            </div>

            <TextareaInput
              label="Descricao da falha / sintoma"
              required={ehQuebra}
              rows={2}
              hint="O laudo de quem foi ver - diferente do pedido que abriu a OS."
              {...register("failureDescription")}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextareaInput label="Causa identificada" rows={2} hint="A causa raiz de verdade sai da RCA." {...register("failureRootCause")} />
              <TextareaInput label="Acao corretiva tomada" rows={2} {...register("failureCorrectiveAction")} />
            </div>
          </div>
        )}

        <div className="card space-y-4 p-5">
          <div>
            <h2 className="font-semibold text-navy-900">Planejamento</h2>
            <p className="text-xs text-graphite-500">
              A data agendada e' o dia em que a OS aparece na programacao. A janela e as horas estimadas
              sao a previsao - o que foi realmente gasto e' apontado na aba Equipe e horas da OS.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <TextInput label="Data agendada" type="date" {...register("scheduledDate")} />
            <TextInput label="Inicio planejado" type="datetime-local" {...register("plannedStart")} />
            <TextInput
              label="Termino planejado"
              type="datetime-local"
              error={errors.plannedEnd?.message}
              {...register("plannedEnd")}
            />
            <TextInput label="Horas estimadas" type="number" step="0.5" min="0" {...register("estimatedHours")} />
          </div>
        </div>

        <div className="card space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-navy-900">Operacoes do servico</h2>
              <p className="text-xs text-graphite-500">O que fazer, em ordem, e o tempo esperado de cada uma (em minutos).</p>
            </div>
            <button type="button" className="btn-ghost btn-sm" onClick={() => append({ description: "", estimatedMinutes: "" })}>
              <Plus className="h-4 w-4" /> Adicionar item
            </button>
          </div>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <TextInput
                  className="flex-1"
                  placeholder={`Operacao ${index + 1}`}
                  error={errors.checklist?.[index]?.description?.message}
                  {...register(`checklist.${index}.description`)}
                />
                <TextInput
                  className="w-28 shrink-0"
                  type="number"
                  min="0"
                  placeholder="min"
                  {...register(`checklist.${index}.estimatedMinutes`)}
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
