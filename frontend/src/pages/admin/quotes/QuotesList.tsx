import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listQuotes } from "../../../api/quotes";
import type { QuoteStatus } from "../../../api/types";
import { PageHeader } from "../../../components/PageHeader";
import { DataTable } from "../../../components/DataTable";
import { StatusBadge } from "../../../components/StatusBadge";
import { clientDisplayName, formatDate } from "../../../lib/format";

const STATUS_OPTIONS: { value: QuoteStatus; label: string }[] = [
  { value: "NEW", label: "Novo" },
  { value: "IN_ANALYSIS", label: "Em analise" },
  { value: "QUOTE_SENT", label: "Orcamento enviado" },
  { value: "APPROVED", label: "Aprovado" },
  { value: "REJECTED", label: "Recusado" },
  { value: "EXPIRED", label: "Expirado" },
];

const SOURCE_LABELS: Record<string, string> = {
  SERVICE_REQUEST: "Servico",
  PRODUCT_CART: "Produtos",
  CONTACT: "Contato",
};

export default function QuotesList() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<QuoteStatus | "">("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["quotes", status, page],
    queryFn: () => listQuotes({ status: status || undefined, page, pageSize: 15 }),
  });

  return (
    <div>
      <PageHeader title="Orcamentos" description="Solicitacoes de servico, contato e cotacoes de produtos" />

      <div className="mb-4 max-w-xs">
        <select className="input" value={status} onChange={(e) => { setStatus(e.target.value as QuoteStatus | ""); setPage(1); }}>
          <option value="">Todos os status</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <DataTable
        loading={isLoading}
        rows={data?.items ?? []}
        keyField={(q) => q.id}
        onRowClick={(q) => navigate(`/gestao/orcamentos/${q.id}`)}
        pagination={data}
        onPageChange={setPage}
        emptyTitle="Nenhuma solicitacao recebida"
        columns={[
          { header: "Numero", accessor: (q) => <span className="font-medium text-navy-900">{q.number}</span> },
          { header: "Origem", accessor: (q) => SOURCE_LABELS[q.source] ?? q.source },
          { header: "Contato", accessor: (q) => q.client ? clientDisplayName(q.client) : q.contactName },
          { header: "Data", accessor: (q) => formatDate(q.createdAt) },
          { header: "Status", accessor: (q) => <StatusBadge status={q.status} /> },
        ]}
      />
    </div>
  );
}
