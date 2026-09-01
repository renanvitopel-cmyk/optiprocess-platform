import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listOrders } from "../../../api/orders";
import type { OrderStatus } from "../../../api/types";
import { PageHeader } from "../../../components/PageHeader";
import { DataTable } from "../../../components/DataTable";
import { StatusBadge } from "../../../components/StatusBadge";
import { clientDisplayName, formatCurrency, formatDate } from "../../../lib/format";

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "PENDING", label: "Pendente" },
  { value: "SEPARATED", label: "Separado" },
  { value: "DELIVERED", label: "Entregue" },
  { value: "CANCELED", label: "Cancelado" },
];

export default function OrdersList() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["orders", status, page],
    queryFn: () => listOrders({ status: status || undefined, page, pageSize: 15 }),
  });

  return (
    <div>
      <PageHeader title="Pedidos" description="Pedidos confirmados a partir de orcamentos aprovados" />

      <div className="mb-4 max-w-xs">
        <select className="input" value={status} onChange={(e) => { setStatus(e.target.value as OrderStatus | ""); setPage(1); }}>
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
        onRowClick={(o) => navigate(`/gestao/pedidos/${o.id}`)}
        pagination={data}
        onPageChange={setPage}
        emptyTitle="Nenhum pedido registrado"
        columns={[
          { header: "Numero", accessor: (o) => <span className="font-medium text-navy-900">{o.number}</span> },
          { header: "Cliente", accessor: (o) => clientDisplayName(o.client) },
          { header: "Data", accessor: (o) => formatDate(o.createdAt) },
          { header: "Total", accessor: (o) => formatCurrency(o.totalAmount) },
          { header: "Pagamento", accessor: (o) => <StatusBadge status={o.paymentStatus} /> },
          { header: "Status", accessor: (o) => <StatusBadge status={o.status} /> },
        ]}
      />
    </div>
  );
}
