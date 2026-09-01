import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listServiceOrders } from "../../api/serviceOrders";
import { PageHeader } from "../../components/PageHeader";
import { DataTable } from "../../components/DataTable";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDate, formatServiceCategory } from "../../lib/format";

export default function PortalServiceOrders() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["portal-service-orders", page],
    queryFn: () => listServiceOrders({ page, pageSize: 15 }),
  });

  return (
    <div>
      <PageHeader title="Minhas ordens de servico" description="Historico de atendimentos tecnicos" />

      <DataTable
        loading={isLoading}
        rows={data?.items ?? []}
        keyField={(o) => o.id}
        onRowClick={(o) => navigate(`/portal/ordens-servico/${o.id}`)}
        pagination={data}
        onPageChange={setPage}
        emptyTitle="Nenhuma ordem de servico registrada"
        columns={[
          { header: "Numero", accessor: (o) => <span className="font-medium text-navy-900">{o.number}</span> },
          { header: "Categoria", accessor: (o) => formatServiceCategory(o.category) },
          { header: "Agendada para", accessor: (o) => formatDate(o.scheduledDate) },
          { header: "Status", accessor: (o) => <StatusBadge status={o.status} /> },
          { header: "Aprovada", accessor: (o) => (o.clientApprovedAt ? formatDate(o.clientApprovedAt) : "-") },
        ]}
      />
    </div>
  );
}
