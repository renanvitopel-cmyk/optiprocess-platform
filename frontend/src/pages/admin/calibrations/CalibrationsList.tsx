import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { listCalibrations } from "../../../api/calibrations";
import { PageHeader } from "../../../components/PageHeader";
import { DataTable } from "../../../components/DataTable";
import { StatusBadge } from "../../../components/StatusBadge";
import { clientDisplayName, formatDate } from "../../../lib/format";
import { useAuth } from "../../../auth/AuthContext";

export default function CalibrationsList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get("clientId") ?? undefined;
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "TECHNICIAN";

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["calibrations", search, page, clientId],
    queryFn: () => listCalibrations({ search: search || undefined, page, pageSize: 15, clientId }),
  });

  return (
    <div>
      <PageHeader
        title="Calibracoes"
        description="Certificados de calibracao de instrumentos"
        actions={
          canManage && (
            <Link to="/gestao/calibracoes/novo" className="btn-primary">
              <Plus className="h-4 w-4" /> Novo certificado
            </Link>
          )
        }
      />

      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
        <input
          className="input pl-9"
          placeholder="Buscar por numero do certificado..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <DataTable
        loading={isLoading}
        rows={data?.items ?? []}
        keyField={(c) => c.id}
        onRowClick={(c) => navigate(`/gestao/calibracoes/${c.id}`)}
        pagination={data}
        onPageChange={setPage}
        emptyTitle="Nenhum certificado emitido"
        columns={[
          { header: "Certificado", accessor: (c) => <span className="font-medium text-navy-900">{c.certificateNumber}</span> },
          { header: "Cliente", accessor: (c) => clientDisplayName(c.client) },
          { header: "Instrumento", accessor: (c) => `${c.instrument?.model} (${c.instrument?.serialNumber})` },
          { header: "Data", accessor: (c) => formatDate(c.calibrationDate) },
          { header: "Validade", accessor: (c) => formatDate(c.validUntil) },
          { header: "Status", accessor: (c) => <StatusBadge status={c.status} /> },
          { header: "Portal cliente", accessor: (c) => (c.visibleToClient ? <StatusBadge status="ISSUED" label="Liberado" /> : <StatusBadge status="DRAFT" label="Oculto" />) },
        ]}
      />
    </div>
  );
}
