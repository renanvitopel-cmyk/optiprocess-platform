import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listInstruments } from "../../api/instruments";
import { PageHeader } from "../../components/PageHeader";
import { DataTable } from "../../components/DataTable";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDate } from "../../lib/format";

export default function PortalInstruments() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["portal-instruments", page],
    queryFn: () => listInstruments({ page, pageSize: 15 }),
  });

  return (
    <div>
      <PageHeader title="Meus instrumentos" description="Equipamentos cadastrados sob sua responsabilidade" />

      <DataTable
        loading={isLoading}
        rows={data?.items ?? []}
        keyField={(i) => i.id}
        onRowClick={(i) => navigate(`/portal/instrumentos/${i.id}`)}
        pagination={data}
        onPageChange={setPage}
        emptyTitle="Nenhum instrumento cadastrado"
        columns={[
          { header: "Tag", accessor: (i) => i.tag ?? "-" },
          { header: "Equipamento", accessor: (i) => <span className="font-medium text-navy-900">{i.type} - {i.model}</span> },
          { header: "Numero de serie", accessor: (i) => i.serialNumber },
          { header: "Proxima calibracao", accessor: (i) => formatDate(i.nextDueDate) },
          { header: "Status", accessor: (i) => <StatusBadge status={i.derivedStatus ?? i.status} /> },
        ]}
      />
    </div>
  );
}
