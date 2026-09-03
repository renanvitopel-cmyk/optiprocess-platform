import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { listLaborResources, createLaborResource, updateLaborResource } from "../../../api/laborResources";
import { listClients } from "../../../api/clients";
import type { LaborResource } from "../../../api/types";
import { PageHeader } from "../../../components/PageHeader";
import { DataTable } from "../../../components/DataTable";
import { StatusBadge } from "../../../components/StatusBadge";
import { EmptyState } from "../../../components/EmptyState";
import { Modal } from "../../../components/Modal";
import { TextInput } from "../../../components/form/Field";
import { LaborTypeInput } from "../../../components/LaborTypeInput";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";
import { clientDisplayName, formatCurrency } from "../../../lib/format";
import { useCmms } from "../../../lib/cmms";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  type: z.string().min(1, "Informe o tipo de mao de obra."),
  name: z.string().min(2, "Informe o nome."),
  registrationNumber: z.string().optional(),
  hourlyRate: z.coerce.number().nonnegative().optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

export default function LaborResourcesList() {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const { isClient, ownClientId, base } = useCmms();
  const [searchParams, setSearchParams] = useSearchParams();
  const clientId = isClient ? (ownClientId ?? "") : (searchParams.get("clientId") ?? "");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: clients } = useQuery({
    queryKey: ["clients-picker-cmms"],
    queryFn: () => listClients({ pageSize: 200, service: "CMMS_MAINTENANCE" }),
    enabled: !isClient,
  });
  const { data, isLoading } = useQuery({
    queryKey: ["labor-resources", clientId, search, page],
    queryFn: () => listLaborResources({ clientId: clientId || undefined, search: search || undefined, page, pageSize: 15 }),
    enabled: isClient || !!clientId,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    try {
      await createLaborResource({ ...values, clientId: clientId || undefined, hourlyRate: values.hourlyRate === "" ? null : values.hourlyRate });
      notify("success", "Mao de obra cadastrada.");
      reset();
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["labor-resources"] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function toggleActive(resource: LaborResource) {
    try {
      await updateLaborResource(resource.id, { active: !resource.active });
      queryClient.invalidateQueries({ queryKey: ["labor-resources"] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  return (
    <div>
      <PageHeader
        title="Mao de obra"
        description="Tecnicos, engenheiros e outros recursos que executam as OS - com valor/hora pra apurar custo de manutencao por ativo"
        breadcrumbs={[{ label: "RLP Maintenance CMMS", to: base }, { label: "Mao de obra" }]}
        actions={
          (isClient || clientId) && (
            <button className="btn-primary" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Nova mao de obra
            </button>
          )
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        {!isClient && (
          <select className="input sm:w-72" value={clientId} onChange={(e) => setSearchParams(e.target.value ? { clientId: e.target.value } : {})}>
            <option value="">Selecione o cliente</option>
            {(clients?.items ?? []).map((c) => (
              <option key={c.id} value={c.id}>{clientDisplayName(c)}</option>
            ))}
          </select>
        )}
        {(isClient || clientId) && (
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
            <input
              className="input pl-9"
              placeholder="Buscar por nome, tipo ou registro..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        )}
      </div>

      {!isClient && !clientId ? (
        <EmptyState title="Selecione um cliente" description="A mao de obra e' propria de cada empresa - escolha uma acima para ver os recursos dela." />
      ) : (
        <DataTable
          loading={isLoading}
          rows={data?.items ?? []}
          keyField={(r) => r.id}
          pagination={data}
          onPageChange={setPage}
          emptyTitle="Nenhuma mao de obra cadastrada"
          columns={[
            { header: "Nome", accessor: (r) => <span className="font-medium text-navy-900">{r.name}</span> },
            { header: "Tipo", accessor: (r) => r.type },
            { header: "DRT", accessor: (r) => r.registrationNumber ?? "-" },
            { header: "Valor/hora", accessor: (r) => (r.hourlyRate != null ? formatCurrency(r.hourlyRate) : "-") },
            {
              header: "Status",
              accessor: (r) => (
                <button onClick={() => toggleActive(r)} className="cursor-pointer">
                  <StatusBadge status={r.active ? "ACTIVE" : "INACTIVE"} />
                </button>
              ),
            },
          ]}
        />
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nova mao de obra"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setCreateOpen(false)}>Cancelar</button>
            <button type="submit" form="labor-resource-form" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </button>
          </>
        }
      >
        <form id="labor-resource-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <TextInput label="Nome" required placeholder="Ex.: Joao Silva" error={errors.name?.message} {...register("name")} />
          <LaborTypeInput required error={errors.type?.message} {...register("type")} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="DRT (opcional)" hint="Registro profissional (CREA, CFT, DRT...), quando aplicavel." {...register("registrationNumber")} />
            <TextInput label="Valor/hora (opcional)" type="number" step="any" {...register("hourlyRate")} />
          </div>
        </form>
      </Modal>
    </div>
  );
}
