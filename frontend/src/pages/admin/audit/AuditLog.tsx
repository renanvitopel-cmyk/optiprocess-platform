import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listAuditLogs } from "../../../api/audit";
import { PageHeader } from "../../../components/PageHeader";
import { DataTable } from "../../../components/DataTable";
import { formatDateTime } from "../../../lib/format";

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Criacao",
  UPDATE: "Atualizacao",
  DELETE: "Exclusao",
  APPROVE: "Aprovacao",
  PUBLISH: "Publicacao",
  HIDE: "Ocultacao",
  LOGIN: "Login",
};

const ENTITY_OPTIONS = [
  "Client",
  "Instrument",
  "Calibration",
  "TechnicalReport",
  "ServiceOrder",
  "ServiceContract",
  "Product",
  "Quote",
  "Order",
  "User",
];

export default function AuditLog() {
  const [entityType, setEntityType] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", entityType, page],
    queryFn: () => listAuditLogs({ entityType: entityType || undefined, page, pageSize: 20 }),
  });

  return (
    <div>
      <PageHeader title="Auditoria" description="Registro de acoes relevantes no sistema" />

      <div className="mb-4 max-w-xs">
        <select className="input" value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }}>
          <option value="">Todos os registros</option>
          {ENTITY_OPTIONS.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
      </div>

      <DataTable
        loading={isLoading}
        rows={data?.items ?? []}
        keyField={(l) => l.id}
        pagination={data}
        onPageChange={setPage}
        emptyTitle="Nenhum registro de auditoria"
        columns={[
          { header: "Data", accessor: (l) => formatDateTime(l.createdAt) },
          { header: "Usuario", accessor: (l) => l.user?.name ?? "Sistema" },
          { header: "Acao", accessor: (l) => ACTION_LABELS[l.action] ?? l.action },
          { header: "Entidade", accessor: (l) => l.entityType },
          { header: "Descricao", accessor: (l) => l.description ?? "-" },
        ]}
      />
    </div>
  );
}
