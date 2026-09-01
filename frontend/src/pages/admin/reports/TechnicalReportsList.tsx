import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { listTechnicalReports } from "../../../api/technicalReports";
import type { TechnicalReportCategory } from "../../../api/types";
import { PageHeader } from "../../../components/PageHeader";
import { DataTable } from "../../../components/DataTable";
import { StatusBadge } from "../../../components/StatusBadge";
import { clientDisplayName, formatDate, formatReportCategory } from "../../../lib/format";
import { useAuth } from "../../../auth/AuthContext";
import { TechnicalReportFormModal } from "./TechnicalReportFormModal";

const CATEGORY_OPTIONS: { value: TechnicalReportCategory; label: string }[] = [
  { value: "ELECTRICAL_INSTALLATION", label: "Instalacoes eletricas" },
  { value: "THERMOGRAPHY", label: "Termografia" },
  { value: "GROUNDING", label: "Aterramento" },
  { value: "SPDA", label: "SPDA" },
  { value: "OTHER", label: "Outros" },
];

export default function TechnicalReportsList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get("clientId") ?? undefined;
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "TECHNICIAN";

  const [category, setCategory] = useState<TechnicalReportCategory | "">("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["technical-reports", category, page, clientId],
    queryFn: () => listTechnicalReports({ category: category || undefined, page, pageSize: 15, clientId }),
  });

  return (
    <div>
      <PageHeader
        title="Laudos tecnicos"
        description="Instalacoes eletricas, termografia, aterramento e SPDA"
        actions={
          canManage && (
            <button className="btn-primary" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Novo laudo
            </button>
          )
        }
      />

      <div className="mb-4 max-w-xs">
        <select className="input" value={category} onChange={(e) => { setCategory(e.target.value as TechnicalReportCategory | ""); setPage(1); }}>
          <option value="">Todas as categorias</option>
          {CATEGORY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <DataTable
        loading={isLoading}
        rows={data?.items ?? []}
        keyField={(r) => r.id}
        onRowClick={(r) => navigate(`/gestao/laudos/${r.id}`)}
        pagination={data}
        onPageChange={setPage}
        emptyTitle="Nenhum laudo cadastrado"
        columns={[
          { header: "Numero", accessor: (r) => <span className="font-medium text-navy-900">{r.number}</span> },
          { header: "Categoria", accessor: (r) => formatReportCategory(r.category) },
          { header: "Cliente", accessor: (r) => clientDisplayName(r.client) },
          { header: "Data", accessor: (r) => formatDate(r.reportDate) },
          { header: "Status", accessor: (r) => <StatusBadge status={r.status} /> },
        ]}
      />

      <TechnicalReportFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={(report) => {
          setCreateOpen(false);
          queryClient.invalidateQueries({ queryKey: ["technical-reports"] });
          navigate(`/gestao/laudos/${report.id}`);
        }}
      />
    </div>
  );
}
