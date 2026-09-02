import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BadgeCheck, AlertTriangle, ShieldX, FileWarning, FileSignature, ShoppingCart, Gauge, TimerReset, Activity, Wrench } from "lucide-react";
import { getClientDashboard } from "../../api/dashboard";
import { listMaintenanceWorkOrders, getMaintenanceDashboard } from "../../api/maintenanceWorkOrders";
import { useAuth } from "../../auth/AuthContext";
import { FullPageSpinner } from "../../components/Spinner";
import { StatCard } from "../../components/StatCard";
import { StatusBadge } from "../../components/StatusBadge";
import { clientDisplayName, formatDate, formatReportCategory } from "../../lib/format";
import { EmptyState } from "../../components/EmptyState";

const TYPE_LABELS: Record<string, string> = { PREVENTIVE: "Preventiva", CORRECTIVE: "Corretiva", PREDICTIVE: "Preditiva" };

export default function PortalDashboard() {
  const { user } = useAuth();
  const hasCmms = !!user?.client?.contractedServices?.includes("CMMS_MAINTENANCE");

  const { data, isLoading } = useQuery({ queryKey: ["client-dashboard"], queryFn: getClientDashboard });
  const { data: cmmsDashboard, isLoading: cmmsLoading } = useQuery({
    queryKey: ["portal-maintenance-dashboard-home"],
    queryFn: () => getMaintenanceDashboard({}),
    enabled: hasCmms,
  });
  const { data: workOrders } = useQuery({
    queryKey: ["portal-maintenance-work-orders-home"],
    queryFn: () => listMaintenanceWorkOrders({ pageSize: 6 }),
    enabled: hasCmms,
  });

  if (isLoading || !data || (hasCmms && (cmmsLoading || !cmmsDashboard))) return <FullPageSpinner />;

  if (hasCmms) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-navy-900">RLP Maintenance CMMS</h1>
        <p className="mt-1 text-graphite-500">Gestao de manutencao de {clientDisplayName(user?.client)}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="MTTR (horas)" value={cmmsDashboard!.kpis.mttrHours} icon={TimerReset} tone="navy" to="/portal/manutencao" />
          <StatCard label="MTBF (horas)" value={cmmsDashboard!.kpis.mtbfHours} icon={Activity} tone="navy" to="/portal/manutencao" />
          <StatCard label="Disponibilidade" value={`${cmmsDashboard!.kpis.availabilityPct}%`} icon={Gauge} tone="green" to="/portal/manutencao" />
          <StatCard label="Cumprimento do plano" value={`${cmmsDashboard!.kpis.planComplianceRatePct}%`} icon={Wrench} tone="yellow" to="/portal/manutencao" />
        </div>

        <div className="mt-6 card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-navy-900">Ordens de manutencao recentes</h2>
            <Link to="/portal/manutencao" className="text-sm text-navy-700 hover:underline">Ver todas</Link>
          </div>
          {!workOrders || workOrders.items.length === 0 ? (
            <EmptyState title="Nenhuma ordem de manutencao" description="Ainda nao ha ordens de manutencao registradas." />
          ) : (
            <ul className="divide-y divide-gray-100">
              {workOrders.items.map((w) => (
                <li key={w.id}>
                  <Link to={`/portal/manutencao/${w.id}`} className="flex items-center justify-between py-2.5 text-sm hover:text-navy-700">
                    <div>
                      <p className="font-medium text-graphite-800">{w.number}</p>
                      <p className="text-xs text-graphite-400">{TYPE_LABELS[w.type]} - {w.instrument?.tag ?? "-"}</p>
                    </div>
                    <StatusBadge status={w.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-8 border-t border-gray-200 pt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-graphite-400">Resumo da conta</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <CompactStat label="Certificados validos" value={data.certificates.valid} to="/portal/certificados" />
            <CompactStat label="Proximos do vencimento" value={data.certificates.dueSoon} to="/portal/certificados" />
            <CompactStat label="Certificados vencidos" value={data.certificates.expired} to="/portal/certificados" />
            <CompactStat label="Contratos ativos" value={data.activeContracts} to="/portal/contratos" />
            <CompactStat label="Orcamentos/pedidos em aberto" value={data.openQuotesAndOrders} to="/portal/pedidos" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-900">Ola, {clientDisplayName(user?.client)}</h1>
      <p className="mt-1 text-graphite-500">Aqui esta um resumo da sua conta com a OptiProcess.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Certificados validos" value={data.certificates.valid} icon={BadgeCheck} tone="green" to="/portal/certificados" />
        <StatCard label="Proximos do vencimento" value={data.certificates.dueSoon} icon={AlertTriangle} tone="yellow" to="/portal/certificados" />
        <StatCard label="Certificados vencidos" value={data.certificates.expired} icon={ShieldX} tone="red" to="/portal/certificados" />
        <StatCard label="Contratos ativos" value={data.activeContracts} icon={FileSignature} tone="navy" to="/portal/contratos" />
        <StatCard label="Orcamentos/pedidos em aberto" value={data.openQuotesAndOrders} icon={ShoppingCart} tone="navy" to="/portal/pedidos" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-navy-900">Proximos servicos agendados</h2>
          {data.upcomingServiceOrders.length === 0 ? (
            <EmptyState title="Nada agendado" description="Voce nao tem servicos agendados no momento." />
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.upcomingServiceOrders.map((so) => (
                <li key={so.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-graphite-700">{so.number} - {so.description.slice(0, 40)}</span>
                  <span className="text-graphite-500">{formatDate(so.scheduledDate)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-navy-900">
              <FileWarning className="h-4 w-4" /> Ultimos laudos
            </h2>
            <Link to="/portal/laudos" className="text-sm text-navy-700 hover:underline">Ver todos</Link>
          </div>
          {data.recentReports.length === 0 ? (
            <EmptyState title="Nenhum laudo disponivel" />
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.recentReports.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="text-graphite-700">{r.number}</p>
                    <p className="text-xs text-graphite-400">{formatReportCategory(r.category)}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function CompactStat({ label, value, to }: { label: string; value: number; to: string }) {
  return (
    <Link to={to} className="rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-navy-200 hover:bg-navy-50/40">
      <p className="text-lg font-bold text-navy-900">{value}</p>
      <p className="text-xs text-graphite-500">{label}</p>
    </Link>
  );
}
