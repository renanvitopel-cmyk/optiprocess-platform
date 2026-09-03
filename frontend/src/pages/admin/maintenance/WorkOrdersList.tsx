import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { listMaintenanceWorkOrders } from "../../../api/maintenanceWorkOrders";
import type { MaintenanceOrderStatus, MaintenanceOrderType, MaintenanceWorkOrder } from "../../../api/types";
import { PageHeader } from "../../../components/PageHeader";
import { DataTable } from "../../../components/DataTable";
import { StatusBadge } from "../../../components/StatusBadge";
import { clientDisplayName, formatDate } from "../../../lib/format";
import { useCmms } from "../../../lib/cmms";

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
  const { canManage, isClient, base } = useCmms();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<MaintenanceOrderStatus | "">("");
  // Preditiva chega pre-filtrada via link do menu ("Manutencao preditiva"), mas continua
  // um filtro comum - o usuario pode trocar para outro tipo ou limpar normalmente.
  const [type, setType] = useState<MaintenanceOrderType | "">((searchParams.get("type") as MaintenanceOrderType) || "");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["maintenance-work-orders", search, status, type, page, clientId, instrumentId],
    queryFn: () =>
      listMaintenanceWorkOrders({ search: search || undefined, status: status || undefined, type: type || undefined, page, pageSize: 15, clientId, instrumentId }),
  });

  return (
    <div>
      <PageHeader
        title="Ordens de manutencao"
        description="OS preventivas e corretivas"
        breadcrumbs={[{ label: "RLP Maintenance CMMS", to: base }, { label: "Ordens" }]}
        actions={
          canManage && (
            <button className="btn-primary" onClick={() => navigate(`${base}/ordens/novo`)}>
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
          <option value="IN_TRIAGE">Em triagem</option>
          <option value="PLANNED">Planejada</option>
          <option value="PROGRAMMED">Programada</option>
          <option value="RELEASED">Liberada</option>
          <option value="IN_PROGRESS">Em execucao</option>
          <option value="AWAITING_MATERIAL">Aguardando material</option>
          <option value="AWAITING_RELEASE">Aguardando liberacao</option>
          <option value="AWAITING_STOPPAGE">Aguardando parada</option>
          <option value="COMPLETED">Concluida</option>
          <option value="CANCELED">Cancelada</option>
        </select>
        <select className="input sm:w-56" value={type} onChange={(e) => { setType(e.target.value as MaintenanceOrderType | ""); setPage(1); }}>
          <option value="">Todos os tipos</option>
          <option value="PREVENTIVE">Preventiva</option>
          <option value="CORRECTIVE">Corretiva</option>
          <option value="PREDICTIVE">Preditiva</option>
        </select>
      </div>

      <DataTable
        loading={isLoading}
        rows={data?.items ?? []}
        keyField={(o) => o.id}
        onRowClick={(o) => navigate(`${base}/ordens/${o.id}`)}
        pagination={data}
        onPageChange={setPage}
        emptyTitle="Nenhuma ordem de manutencao"
        columns={[
          { header: "Numero", accessor: (o) => <span className="font-medium text-navy-900">{o.number}</span> },
          ...(isClient ? [] : [{ header: "Cliente", accessor: (o: MaintenanceWorkOrder) => clientDisplayName(o.client) }]),
          { header: "Ativo", accessor: (o) => o.instrument?.tag ?? "-" },
          { header: "Tipo", accessor: (o) => TYPE_LABELS[o.type] },
          ...(isClient ? [] : [{ header: "Tecnico", accessor: (o: MaintenanceWorkOrder) => o.technician?.name ?? "-" }]),
          { header: "Agendada", accessor: (o) => formatDate(o.scheduledDate) },
          { header: "Status", accessor: (o) => <StatusBadge status={o.status} /> },
        ]}
      />
    </div>
  );
}
