import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Download, Eye } from "lucide-react";
import { getCalibrationPdfUrl, listCalibrations } from "../../api/calibrations";
import { PageHeader } from "../../components/PageHeader";
import { DataTable } from "../../components/DataTable";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDate } from "../../lib/format";
import { useToast } from "../../components/Toast";
import { getApiErrorMessage } from "../../api/client";

export default function PortalCertificates() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["portal-certificates", search, page],
    queryFn: () => listCalibrations({ search: search || undefined, page, pageSize: 15 }),
  });

  async function handleDownload(id: string) {
    try {
      const url = await getCalibrationPdfUrl(id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  return (
    <div>
      <PageHeader title="Meus certificados" description="Certificados de calibracao emitidos para sua empresa" />

      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
        <input
          className="input pl-9"
          placeholder="Buscar por numero do certificado..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <DataTable
        loading={isLoading}
        rows={data?.items ?? []}
        keyField={(c) => c.id}
        pagination={data}
        onPageChange={setPage}
        emptyTitle="Nenhum certificado disponivel"
        emptyDescription="Certificados liberados pela nossa equipe tecnica aparecerao aqui."
        columns={[
          { header: "Certificado", accessor: (c) => <span className="font-medium text-navy-900">{c.certificateNumber}</span> },
          { header: "Instrumento", accessor: (c) => `${c.instrument?.type} - ${c.instrument?.model}` },
          { header: "N. de serie", accessor: (c) => c.instrument?.serialNumber ?? "-" },
          { header: "Data", accessor: (c) => formatDate(c.calibrationDate) },
          { header: "Validade", accessor: (c) => formatDate(c.validUntil) },
          { header: "Status", accessor: (c) => <StatusBadge status={c.status} /> },
          {
            header: "Acoes",
            accessor: (c) => (
              <div className="flex gap-3">
                <button onClick={(e) => { e.stopPropagation(); navigate(`/portal/certificados/${c.id}`); }} className="text-navy-600 hover:text-navy-800" aria-label="Visualizar">
                  <Eye className="h-4 w-4" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDownload(c.id); }} className="text-navy-600 hover:text-navy-800" aria-label="Baixar PDF">
                  <Download className="h-4 w-4" />
                </button>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
