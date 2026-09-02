import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { listMaintenanceWorkOrders } from "../../../api/maintenanceWorkOrders";
import type { MaintenanceOrderStatus, MaintenanceOrderType } from "../../../api/types";
import { PageHeader } from "../../../components/PageHeader";
import { DataTable } from "../../../components/DataTable";
import { StatusBadge } from "../../../components/StatusBadge";
import { clientDisplayName, formatDate } from "../../../lib/format";
import { useAuth } from "../../../auth/AuthContext";

const TYPE_LABELS: Record<MaintenanceOrderType, string> = {
  PREVENTIVE: "Preventiva",
  CORRECTIVE: "Corretiva",
  PREDICTIVE: "Preditiva",
};

export default function WorkOrdersList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get("clientId") ?? undefined;
  const instrumentId = searchParams.get("instrumentId") ?? undefined;
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "TECHNICIAN";

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<MaintenanceOrderStatus | "">("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["maintenance-work-orders", search, status, page, clientId, instrumentId],
    queryFn: () => listMaintenanceWorkOrders({ search: search || undefined, status: status || undefined, page, pageSize: 15, clientId, instrumentId }),
  });

  return (
    <div>
      <PageHeader
        title="Ordens de manutencao"
        description="OS preventivas e corretivas"
        breadcrumbs={[{ label: "RLP Maintenance CMMS", to: "/gestao/manutencao" }, { label: "Ordens" }]}
        actions={
          canManage && (
            <button className="btn-primary" onClick={() => navigate("/gestao/manutencao/ordens/novo")}>
              <Plus className="h-4 w-4" /> Nova OS
            </button>
          )
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
          <input
            className="input pl-9"
            placeholder="Buscar por numero..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="input sm:w-56" value={status} onChange={(e) => { setStatus(e.target.value as MaintenanceOrderStatus | ""); setPage(1); }}>
          <option value="">Todos os status</option>
          <option value="OPEN">Aberta</option>
          <option value="IN_PROGRESS">Em andamento</option>
          <option value="COMPLETED">Concluida</option>
          <option value="CANCELED">Cancelada</option>
        </select>
      </div>

      <DataTable
        loading={isLoading}
        rows={data?.items ?? []}
        keyField={(o) => o.id}
        onRowClick={(o) => navigate(`/gestao/manutencao/ordens/${o.id}`)}
        pagination={data}
        onPageChange={setPage}
        emptyTitle="Nenhuma ordem de manutencao"
        columns={[
          { header: "Numero", accessor: (o) => <span className="font-medium text-navy-900">{o.number}</span> },
          { header: "Cliente", accessor: (o) => clientDisplayName(o.client) },
          { header: "Ativo", accessor: (o) => o.instrument?.tag ?? "-" },
          { header: "Tipo", accessor: (o) => TYPE_LABELS[o.type] },
          { header: "Tecnico", accessor: (o) => o.technician?.name ?? "-" },
          { header: "Agendada", accessor: (o) => formatDate(o.scheduledDate) },
          { header: "Status", accessor: (o) => <StatusBadge status={o.status} /> },
        ]}
      />
    </div>
  );
}
