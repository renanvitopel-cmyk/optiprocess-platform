import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { getTechnicalReportPdfUrl, listTechnicalReports } from "../../api/technicalReports";
import { PageHeader } from "../../components/PageHeader";
import { DataTable } from "../../components/DataTable";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDate, formatReportCategory } from "../../lib/format";
import { useToast } from "../../components/Toast";
import { getApiErrorMessage } from "../../api/client";

export default function PortalReports() {
  const { notify } = useToast();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["portal-reports", page],
    queryFn: () => listTechnicalReports({ page, pageSize: 15 }),
  });

  async function handleDownload(id: string) {
    try {
      const url = await getTechnicalReportPdfUrl(id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  return (
    <div>
      <PageHeader title="Meus laudos tecnicos" description="Relatorios tecnicos emitidos para sua empresa" />

      <DataTable
        loading={isLoading}
        rows={data?.items ?? []}
        keyField={(r) => r.id}
        pagination={data}
        onPageChange={setPage}
        emptyTitle="Nenhum laudo disponivel"
        columns={[
          { header: "Numero", accessor: (r) => <span className="font-medium text-navy-900">{r.number}</span> },
          { header: "Categoria", accessor: (r) => formatReportCategory(r.category) },
          { header: "Local", accessor: (r) => r.location },
          { header: "Data", accessor: (r) => formatDate(r.reportDate) },
          { header: "Status", accessor: (r) => <StatusBadge status={r.status} /> },
          {
            header: "",
            accessor: (r) =>
              r.pdfAttachment ? (
                <button onClick={() => handleDownload(r.id)} className="text-navy-600 hover:text-navy-800" aria-label="Baixar PDF">
                  <Download className="h-4 w-4" />
                </button>
              ) : null,
          },
        ]}
      />
    </div>
  );
}
