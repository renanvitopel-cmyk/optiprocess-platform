import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, ArrowDownCircle, ArrowUpCircle, AlertTriangle } from "lucide-react";
import { listSpareParts, createSparePart, addSparePartMovement } from "../../api/spareParts";
import type { SparePart } from "../../api/types";
import { PageHeader } from "../../components/PageHeader";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { TextInput } from "../../components/form/Field";
import { useToast } from "../../components/Toast";
import { getApiErrorMessage } from "../../api/client";
import { formatCurrency } from "../../lib/format";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2, "Informe o nome da peca."),
  code: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().optional(),
  minStock: z.coerce.number().int().nonnegative().optional(),
  unitCost: z.coerce.number().nonnegative().optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

/** Almoxarifado do proprio cliente - so as pecas que ele mesmo cadastrou, nada da
 * OptiProcess nem de outras empresas. */
export default function PortalSpareParts() {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["portal-spare-parts", search, page],
    queryFn: () => listSpareParts({ search: search || undefined, page, pageSize: 15 }),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { unit: "un" },
  });

  async function onSubmit(values: FormValues) {
    try {
      await createSparePart({ ...values, unitCost: values.unitCost === "" ? null : values.unitCost });
      notify("success", "Peca cadastrada no seu almoxarifado.");
      reset({ unit: "un" });
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["portal-spare-parts"] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function handleMovement(part: SparePart, type: "IN" | "OUT") {
    const raw = window.prompt(type === "IN" ? `Entrada de quantos "${part.name}"?` : `Saida de quantos "${part.name}"?`);
    if (!raw || Number.isNaN(Number(raw)) || Number(raw) <= 0) return;
    let unitCost: number | undefined;
    if (type === "IN") {
      const costRaw = window.prompt(`Custo unitario desta compra (opcional, deixe em branco pra pular):`, part.unitCost != null ? String(part.unitCost) : "");
      if (costRaw && !Number.isNaN(Number(costRaw)) && Number(costRaw) >= 0) unitCost = Number(costRaw);
    }
    try {
      await addSparePartMovement(part.id, { type, quantity: Math.trunc(Number(raw)), unitCost });
      notify("success", "Estoque atualizado.");
      queryClient.invalidateQueries({ queryKey: ["portal-spare-parts"] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  return (
    <div>
      <PageHeader
        title="Meu almoxarifado"
        description="Pecas de manutencao dos seus ativos (rolamentos, retentores, disjuntores...) - so voce ve e mexe neste estoque"
        breadcrumbs={[{ label: "RLP Maintenance CMMS", to: "/portal/manutencao" }, { label: "Meu almoxarifado" }]}
        actions={
          <button className="btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Nova peca
          </button>
        }
      />

      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
        <input
          className="input pl-9"
          placeholder="Buscar por nome, codigo ou categoria..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {data && data.items.some((p) => p.unitCost != null) && (
        <p className="mb-3 text-sm text-graphite-600">
          Valor do estoque desta pagina:{" "}
          <span className="font-semibold text-navy-900">
            {formatCurrency(data.items.reduce((sum, p) => sum + (p.unitCost ?? 0) * p.stockQty, 0))}
          </span>
        </p>
      )}

      <DataTable
        loading={isLoading}
        rows={data?.items ?? []}
        keyField={(p) => p.id}
        pagination={data}
        onPageChange={setPage}
        emptyTitle="Nenhuma peca cadastrada ainda"
        emptyDescription="Cadastre as pecas que voce usa na manutencao dos seus ativos."
        columns={[
          {
            header: "Peca",
            accessor: (p) => (
              <div>
                <span className="font-medium text-navy-900">{p.name}</span>
                {p.code && <span className="ml-2 font-mono text-xs text-graphite-400">{p.code}</span>}
              </div>
            ),
          },
          { header: "Categoria", accessor: (p) => p.category ?? "-" },
          {
            header: "Reservado",
            accessor: (p) => (p.reservedQty > 0 ? <span className="text-safety-yellow-dark">{p.reservedQty} {p.unit} <span className="text-xs text-graphite-400">(disp.: {p.stockQty - p.reservedQty})</span></span> : "-"),
          },
          {
            header: "Custo unit.",
            accessor: (p) => (p.unitCost != null ? formatCurrency(p.unitCost) : "-"),
          },
          {
            header: "Valor em estoque",
            accessor: (p) => (p.unitCost != null ? formatCurrency(p.unitCost * p.stockQty) : "-"),
          },
          {
            header: "Estoque",
            accessor: (p) => (
              <span className={`flex items-center gap-1.5 font-medium ${p.stockQty <= p.minStock ? "text-safety-red" : "text-graphite-800"}`}>
                {p.stockQty <= p.minStock && <AlertTriangle className="h-3.5 w-3.5" />}
                {p.stockQty} {p.unit} {p.minStock > 0 && <span className="text-xs text-graphite-400">(min. {p.minStock})</span>}
              </span>
            ),
          },
          {
            header: "Movimentar",
            accessor: (p) => (
              <div className="flex gap-2">
                <button onClick={() => handleMovement(p, "IN")} className="text-graphite-400 hover:text-safety-green" title="Entrada" aria-label="Registrar entrada">
                  <ArrowDownCircle className="h-4 w-4" />
                </button>
                <button onClick={() => handleMovement(p, "OUT")} className="text-graphite-400 hover:text-safety-red" title="Saida" aria-label="Registrar saida">
                  <ArrowUpCircle className="h-4 w-4" />
                </button>
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nova peca do almoxarifado"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setCreateOpen(false)}>Cancelar</button>
            <button type="submit" form="portal-spare-part-form" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </button>
          </>
        }
      >
        <form id="portal-spare-part-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <TextInput label="Nome" required placeholder="Ex.: Rolamento 6205" error={errors.name?.message} {...register("name")} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Codigo (opcional)" placeholder="Ex.: ROL-6205" {...register("code")} />
            <TextInput label="Categoria (opcional)" placeholder="Ex.: Rolamentos" {...register("category")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Unidade" {...register("unit")} />
            <TextInput label="Estoque minimo" type="number" {...register("minStock")} />
          </div>
          <TextInput
            label="Custo unitario (opcional)"
            type="number"
            step="any"
            hint="So alimenta o valor do estoque quando preenchido - pode deixar em branco."
            {...register("unitCost")}
          />
        </form>
      </Modal>
    </div>
  );
}
