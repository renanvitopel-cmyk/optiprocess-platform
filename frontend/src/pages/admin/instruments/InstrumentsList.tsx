import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { listInstruments } from "../../../api/instruments";
import type { InstrumentStatus } from "../../../api/types";
import { PageHeader } from "../../../components/PageHeader";
import { DataTable } from "../../../components/DataTable";
import { StatusBadge } from "../../../components/StatusBadge";
import { clientDisplayName, formatDate } from "../../../lib/format";
import { InstrumentFormModal } from "./InstrumentFormModal";
import { useAuth } from "../../../auth/AuthContext";

export default function InstrumentsList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get("clientId") ?? undefined;
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "TECHNICIAN";

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<InstrumentStatus | "">("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["instruments", search, status, page, clientId],
    queryFn: () => listInstruments({ search: search || undefined, status: status || undefined, page, pageSize: 15, clientId }),
  });

  return (
    <div>
      <PageHeader
        title="Instrumentos"
        description="Equipamentos dos clientes sujeitos a calibracao"
        actions={
          canManage && (
            <button className="btn-primary" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Novo instrumento
            </button>
          )
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
          <input
            className="input pl-9"
            placeholder="Buscar por tag, modelo, numero de serie..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select className="input sm:w-56" value={status} onChange={(e) => { setStatus(e.target.value as InstrumentStatus | ""); setPage(1); }}>
          <option value="">Todos os status</option>
          <option value="VALID">Valido</option>
          <option value="DUE_SOON">Proximo do vencimento</option>
          <option value="EXPIRED">Vencido</option>
          <option value="IN_MAINTENANCE">Em manutencao</option>
        </select>
      </div>

      <DataTable
        loading={isLoading}
        rows={data?.items ?? []}
        keyField={(i) => i.id}
        onRowClick={(i) => navigate(`/gestao/instrumentos/${i.id}`)}
        pagination={data}
        onPageChange={setPage}
        emptyTitle="Nenhum instrumento cadastrado"
        columns={[
          { header: "Tag", accessor: (i) => i.tag ?? "-" },
          { header: "Equipamento", accessor: (i) => <span className="font-medium text-navy-900">{i.type} - {i.model}</span> },
          { header: "Cliente", accessor: (i) => clientDisplayName(i.client) },
          { header: "Proxima calibracao", accessor: (i) => formatDate(i.nextDueDate) },
          { header: "Status", accessor: (i) => <StatusBadge status={i.derivedStatus ?? i.status} /> },
        ]}
      />

      <InstrumentFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={(instrument) => {
          setCreateOpen(false);
          queryClient.invalidateQueries({ queryKey: ["instruments"] });
          navigate(`/gestao/instrumentos/${instrument.id}`);
        }}
      />
    </div>
  );
}
