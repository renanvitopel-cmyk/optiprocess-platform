import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Gauge, TimerReset, Activity, Wrench } from "lucide-react";
import { listMaintenanceWorkOrders, getMaintenanceDashboard } from "../../api/maintenanceWorkOrders";
import { PageHeader } from "../../components/PageHeader";
import { DataTable } from "../../components/DataTable";
import { StatusBadge } from "../../components/StatusBadge";
import { StatCard } from "../../components/StatCard";
import { formatDate } from "../../lib/format";

const TYPE_LABELS: Record<string, string> = { PREVENTIVE: "Preventiva", CORRECTIVE: "Corretiva", PREDICTIVE: "Preditiva" };

export default function PortalMaintenance() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["portal-maintenance-work-orders", page],
    queryFn: () => listMaintenanceWorkOrders({ page, pageSize: 15 }),
  });
  const { data: dashboard } = useQuery({ queryKey: ["portal-maintenance-dashboard"], queryFn: () => getMaintenanceDashboard({}) });

  return (
    <div>
      <PageHeader title="RLP Maintenance CMMS" description="Ordens e indicadores de manutencao dos seus ativos" />

      {dashboard && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="MTTR (horas)" value={dashboard.kpis.mttrHours} icon={TimerReset} tone="navy" />
          <StatCard label="MTBF (horas)" value={dashboard.kpis.mtbfHours} icon={Activity} tone="navy" />
          <StatCard label="Disponibilidade" value={`${dashboard.kpis.availabilityPct}%`} icon={Gauge} tone="green" />
          <StatCard label="Cumprimento do plano" value={`${dashboard.kpis.planComplianceRatePct}%`} icon={Wrench} tone="yellow" />
        </div>
      )}

      <DataTable
        loading={isLoading}
        rows={data?.items ?? []}
        keyField={(o) => o.id}
        onRowClick={(o) => navigate(`/portal/manutencao/${o.id}`)}
        pagination={data}
        onPageChange={setPage}
        emptyTitle="Nenhuma ordem de manutencao registrada"
        columns={[
          { header: "Numero", accessor: (o) => <span className="font-medium text-navy-900">{o.number}</span> },
          { header: "Ativo", accessor: (o) => o.instrument?.tag ?? "-" },
          { header: "Tipo", accessor: (o) => TYPE_LABELS[o.type] },
          { header: "Agendada", accessor: (o) => formatDate(o.scheduledDate) },
          { header: "Status", accessor: (o) => <StatusBadge status={o.status} /> },
        ]}
      />
    </div>
  );
}
