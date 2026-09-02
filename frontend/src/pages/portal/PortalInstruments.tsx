import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { listInstruments } from "../../api/instruments";
import { PageHeader } from "../../components/PageHeader";
import { DataTable } from "../../components/DataTable";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDate } from "../../lib/format";
import { PortalInstrumentFormModal } from "./PortalInstrumentFormModal";

export default function PortalInstruments() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["portal-instruments", page],
    queryFn: () => listInstruments({ page, pageSize: 15 }),
  });

  return (
    <div>
      <PageHeader
        title="Meus ativos"
        description="Equipamentos cadastrados sob sua responsabilidade"
        actions={
          <button className="btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Novo ativo
          </button>
        }
      />

      <DataTable
        loading={isLoading}
        rows={data?.items ?? []}
        keyField={(i) => i.id}
        onRowClick={(i) => navigate(`/portal/instrumentos/${i.id}`)}
        pagination={data}
        onPageChange={setPage}
        emptyTitle="Nenhum ativo cadastrado"
        columns={[
          { header: "Tag", accessor: (i) => i.tag ?? "-" },
          { header: "Equipamento", accessor: (i) => <span className="font-medium text-navy-900">{i.type} - {i.model}</span> },
          { header: "Numero de serie", accessor: (i) => i.serialNumber },
          { header: "Proxima calibracao", accessor: (i) => formatDate(i.nextDueDate) },
          { header: "Status", accessor: (i) => <StatusBadge status={i.derivedStatus ?? i.status} /> },
        ]}
      />

      <PortalInstrumentFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={(instrument) => {
          setCreateOpen(false);
          queryClient.invalidateQueries({ queryKey: ["portal-instruments"] });
          navigate(`/portal/instrumentos/${instrument.id}`);
        }}
      />
    </div>
  );
}
