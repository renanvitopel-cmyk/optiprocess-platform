import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listQuotes } from "../../api/quotes";
import { listOrders } from "../../api/orders";
import { PageHeader } from "../../components/PageHeader";
import { DataTable } from "../../components/DataTable";
import { StatusBadge } from "../../components/StatusBadge";
import { formatCurrency, formatDate } from "../../lib/format";

export default function PortalOrders() {
  const [tab, setTab] = useState<"quotes" | "orders">("orders");
  const [page, setPage] = useState(1);

  const { data: quotes, isLoading: loadingQuotes } = useQuery({
    queryKey: ["portal-quotes", page],
    queryFn: () => listQuotes({ page, pageSize: 15 }),
    enabled: tab === "quotes",
  });

  const { data: orders, isLoading: loadingOrders } = useQuery({
    queryKey: ["portal-orders", page],
    queryFn: () => listOrders({ page, pageSize: 15 }),
    enabled: tab === "orders",
  });

  return (
    <div>
      <PageHeader title="Meus pedidos e orcamentos" description="Acompanhe suas solicitacoes comerciais" />

      <div className="mb-4 flex gap-2">
        <button className={tab === "orders" ? "btn-secondary btn-sm" : "btn-outline btn-sm"} onClick={() => { setTab("orders"); setPage(1); }}>
          Pedidos
        </button>
        <button className={tab === "quotes" ? "btn-secondary btn-sm" : "btn-outline btn-sm"} onClick={() => { setTab("quotes"); setPage(1); }}>
          Orcamentos
        </button>
      </div>

      {tab === "orders" ? (
        <DataTable
          loading={loadingOrders}
          rows={orders?.items ?? []}
          keyField={(o) => o.id}
          pagination={orders}
          onPageChange={setPage}
          emptyTitle="Nenhum pedido ainda"
          columns={[
            { header: "Numero", accessor: (o) => <span className="font-medium text-navy-900">{o.number}</span> },
            { header: "Data", accessor: (o) => formatDate(o.createdAt) },
            { header: "Total", accessor: (o) => formatCurrency(o.totalAmount) },
            { header: "Pagamento", accessor: (o) => <StatusBadge status={o.paymentStatus} /> },
            { header: "Status", accessor: (o) => <StatusBadge status={o.status} /> },
          ]}
        />
      ) : (
        <DataTable
          loading={loadingQuotes}
          rows={quotes?.items ?? []}
          keyField={(q) => q.id}
          pagination={quotes}
          onPageChange={setPage}
          emptyTitle="Nenhum orcamento solicitado"
          columns={[
            { header: "Numero", accessor: (q) => <span className="font-medium text-navy-900">{q.number}</span> },
            { header: "Data", accessor: (q) => formatDate(q.createdAt) },
            { header: "Itens", accessor: (q) => (q.items.length > 0 ? `${q.items.length} produto(s)` : "Solicitacao de servico") },
            { header: "Status", accessor: (q) => <StatusBadge status={q.status} /> },
          ]}
        />
      )}
    </div>
  );
}
