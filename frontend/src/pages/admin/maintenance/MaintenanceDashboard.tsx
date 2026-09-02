import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Wrench, Gauge, ClipboardList, ShieldCheck, Activity, TimerReset, ListChecks } from "lucide-react";
import { getMaintenanceDashboard } from "../../../api/maintenanceWorkOrders";
import { PageHeader } from "../../../components/PageHeader";
import { StatCard } from "../../../components/StatCard";
import { FullPageSpinner } from "../../../components/Spinner";

export default function MaintenanceDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["maintenance-dashboard"],
    queryFn: () => getMaintenanceDashboard({}),
  });

  if (isLoading || !data) return <FullPageSpinner />;

  return (
    <div>
      <PageHeader
        title="RLP Maintenance CMMS"
        description="Gestao de manutencao - planos preventivos, ordens de manutencao e indicadores (ultimos 90 dias)"
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <Link to="/gestao/manutencao/planos" className="btn-outline">
          <ShieldCheck className="h-4 w-4" /> Planos de manutencao
        </Link>
        <Link to="/gestao/manutencao/ordens" className="btn-outline">
          <ClipboardList className="h-4 w-4" /> Ordens de manutencao
        </Link>
        <Link to="/gestao/manutencao/falhas" className="btn-outline">
          <ListChecks className="h-4 w-4" /> Codigos de falha
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="MTTR (horas)" value={data.kpis.mttrHours} icon={TimerReset} tone="navy" />
        <StatCard label="MTBF (horas)" value={data.kpis.mtbfHours} icon={Activity} tone="navy" />
        <StatCard label="Disponibilidade" value={`${data.kpis.availabilityPct}%`} icon={Gauge} tone="green" />
        <StatCard label="Cumprimento do plano" value={`${data.kpis.planComplianceRatePct}%`} icon={Wrench} tone="yellow" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-graphite-400">Ordens abertas</p>
          <p className="mt-1 text-2xl font-bold text-navy-900">{data.totals.open}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-graphite-400">Em andamento</p>
          <p className="mt-1 text-2xl font-bold text-navy-900">{data.totals.inProgress}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-graphite-400">Concluidas (periodo)</p>
          <p className="mt-1 text-2xl font-bold text-navy-900">{data.totals.completed}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-graphite-400">Preventivas (periodo)</p>
          <p className="mt-1 text-2xl font-bold text-navy-900">{data.totals.preventive}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-graphite-400">Corretivas (periodo)</p>
          <p className="mt-1 text-2xl font-bold text-navy-900">{data.totals.corrective}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-graphite-400">Total de OMs (periodo)</p>
          <p className="mt-1 text-2xl font-bold text-navy-900">{data.totals.workOrders}</p>
        </div>
      </div>
    </div>
  );
}
