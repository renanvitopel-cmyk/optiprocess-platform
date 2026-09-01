import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { listServiceOrders } from "../../../api/serviceOrders";
import type { ServiceOrderStatus } from "../../../api/types";
import { PageHeader } from "../../../components/PageHeader";
import { DataTable } from "../../../components/DataTable";
import { StatusBadge } from "../../../components/StatusBadge";
import { clientDisplayName, formatDate, formatServiceCategory } from "../../../lib/format";
import { useAuth } from "../../../auth/AuthContext";

const STATUS_OPTIONS: { value: ServiceOrderStatus; label: string }[] = [
  { value: "BUDGET", label: "Orcamento" },
  { value: "APPROVED", label: "Aprovada" },
  { value: "SCHEDULED", label: "Agendada" },
  { value: "IN_PROGRESS", label: "Em andamento" },
  { value: "COMPLETED", label: "Concluida" },
  { value: "CANCELED", label: "Cancelada" },
];

export default function ServiceOrdersList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get("clientId") ?? undefined;
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "TECHNICIAN" || user?.role === "COMMERCIAL";

  const [status, setStatus] = useState<ServiceOrderStatus | "">("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["service-orders", status, page, clientId],
    queryFn: () => listServiceOrders({ status: status || undefined, page, pageSize: 15, clientId }),
  });

  return (
    <div>
      <PageHeader
        title="Ordens de servico"
        description="Acompanhamento de servicos executados e agendados"
        actions={
          canManage && (
            <Link to="/gestao/ordens-servico/novo" className="btn-primary">
              <Plus className="h-4 w-4" /> Nova OS
            </Link>
          )
        }
      />

      <div className="mb-4 max-w-xs">
        <select className="input" value={status} onChange={(e) => { setStatus(e.target.value as ServiceOrderStatus | ""); setPage(1); }}>
          <option value="">Todos os status</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <DataTable
        loading={isLoading}
        rows={data?.items ?? []}
        keyField={(o) => o.id}
        onRowClick={(o) => navigate(`/gestao/ordens-servico/${o.id}`)}
        pagination={data}
        onPageChange={setPage}
        emptyTitle="Nenhuma ordem de servico"
        columns={[
          { header: "Numero", accessor: (o) => <span className="font-medium text-navy-900">{o.number}</span> },
          { header: "Cliente", accessor: (o) => clientDisplayName(o.client) },
          { header: "Categoria", accessor: (o) => formatServiceCategory(o.category) },
          { header: "Tecnico", accessor: (o) => o.technician?.name ?? "-" },
          { header: "Agendada para", accessor: (o) => formatDate(o.scheduledDate) },
          { header: "Status", accessor: (o) => <StatusBadge status={o.status} /> },
        ]}
      />
    </div>
  );
}
