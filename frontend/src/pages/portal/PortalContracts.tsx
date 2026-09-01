import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { listContracts } from "../../api/contracts";
import { PageHeader } from "../../components/PageHeader";
import { DataTable } from "../../components/DataTable";
import { StatusBadge } from "../../components/StatusBadge";
import { formatCurrency, formatDate } from "../../lib/format";

const PERIODICITY_LABELS: Record<string, string> = {
  MONTHLY: "Mensal",
  QUARTERLY: "Trimestral",
  SEMIANNUAL: "Semestral",
  ANNUAL: "Anual",
  ONE_TIME: "Avulso",
  OTHER: "Outro",
};

export default function PortalContracts() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["portal-contracts", page],
    queryFn: () => listContracts({ page, pageSize: 15 }),
  });

  const expiringSoon = data?.items.filter((c) => c.derivedStatus === "DUE_SOON") ?? [];

  return (
    <div>
      <PageHeader title="Meus contratos e servicos" description="Servicos recorrentes contratados com a OptiProcess" />

      {expiringSoon.length > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-safety-yellow-dark">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Voce tem {expiringSoon.length} contrato(s) proximo(s) do vencimento. Entre em contato para renovacao.
        </div>
      )}

      <DataTable
        loading={isLoading}
        rows={data?.items ?? []}
        keyField={(c) => c.id}
        pagination={data}
        onPageChange={setPage}
        emptyTitle="Nenhum contrato ativo"
        columns={[
          { header: "Servico", accessor: (c) => <span className="font-medium text-navy-900">{c.serviceName}</span> },
          { header: "Periodicidade", accessor: (c) => PERIODICITY_LABELS[c.periodicity] ?? c.periodicity },
          { header: "Vigencia", accessor: (c) => `${formatDate(c.startDate)} - ${formatDate(c.endDate)}` },
          { header: "Valor", accessor: (c) => formatCurrency(c.value) },
          { header: "Status", accessor: (c) => <StatusBadge status={c.derivedStatus ?? c.status} /> },
        ]}
      />
    </div>
  );
}
