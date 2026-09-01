import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { deleteContract, listContracts } from "../../../api/contracts";
import type { ContractStatus, ServiceContract } from "../../../api/types";
import { PageHeader } from "../../../components/PageHeader";
import { DataTable } from "../../../components/DataTable";
import { StatusBadge } from "../../../components/StatusBadge";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { clientDisplayName, formatCurrency, formatDate } from "../../../lib/format";
import { ContractFormModal } from "./ContractFormModal";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";

export default function ContractsList() {
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get("clientId") ?? undefined;
  const queryClient = useQueryClient();
  const { notify } = useToast();

  const [status, setStatus] = useState<ContractStatus | "">("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceContract | undefined>();
  const [deleting, setDeleting] = useState<ServiceContract | undefined>();
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["contracts", status, page, clientId],
    queryFn: () => listContracts({ status: status || undefined, page, pageSize: 15, clientId }),
  });

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteContract(deleting.id);
      notify("success", "Contrato removido.");
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      setDeleting(undefined);
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Contratos e servicos"
        description="Servicos recorrentes e contratos com clientes"
        actions={
          <button className="btn-primary" onClick={() => { setEditing(undefined); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> Novo contrato
          </button>
        }
      />

      <div className="mb-4 max-w-xs">
        <select className="input" value={status} onChange={(e) => { setStatus(e.target.value as ContractStatus | ""); setPage(1); }}>
          <option value="">Todos os status</option>
          <option value="ACTIVE">Ativo</option>
          <option value="EXPIRING_SOON">Vencendo em breve</option>
          <option value="EXPIRED">Vencido</option>
          <option value="CANCELED">Cancelado</option>
        </select>
      </div>

      <DataTable
        loading={isLoading}
        rows={data?.items ?? []}
        keyField={(c) => c.id}
        pagination={data}
        onPageChange={setPage}
        emptyTitle="Nenhum contrato cadastrado"
        columns={[
          { header: "Servico", accessor: (c) => <span className="font-medium text-navy-900">{c.serviceName}</span> },
          { header: "Cliente", accessor: (c) => clientDisplayName(c.client) },
          { header: "Vigencia", accessor: (c) => `${formatDate(c.startDate)} - ${formatDate(c.endDate)}` },
          { header: "Valor", accessor: (c) => formatCurrency(c.value) },
          { header: "Status", accessor: (c) => <StatusBadge status={c.derivedStatus ?? c.status} /> },
          {
            header: "",
            accessor: (c) => (
              <div className="flex gap-2">
                <button onClick={() => { setEditing(c); setFormOpen(true); }} className="text-graphite-400 hover:text-navy-700" aria-label="Editar">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => setDeleting(c)} className="text-graphite-400 hover:text-safety-red" aria-label="Remover">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ),
          },
        ]}
      />

      <ContractFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        contract={editing}
        onSaved={() => {
          setFormOpen(false);
          queryClient.invalidateQueries({ queryKey: ["contracts"] });
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Remover contrato"
        description={`Tem certeza que deseja remover o contrato "${deleting?.serviceName}"?`}
        confirmLabel="Remover"
        danger
        loading={busy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(undefined)}
      />
    </div>
  );
}
