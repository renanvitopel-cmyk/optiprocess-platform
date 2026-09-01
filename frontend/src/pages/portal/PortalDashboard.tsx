import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BadgeCheck, AlertTriangle, ShieldX, FileWarning, FileSignature, ShoppingCart } from "lucide-react";
import { getClientDashboard } from "../../api/dashboard";
import { useAuth } from "../../auth/AuthContext";
import { FullPageSpinner } from "../../components/Spinner";
import { StatCard } from "../../components/StatCard";
import { StatusBadge } from "../../components/StatusBadge";
import { clientDisplayName, formatDate, formatReportCategory } from "../../lib/format";
import { EmptyState } from "../../components/EmptyState";

export default function PortalDashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["client-dashboard"], queryFn: getClientDashboard });

  if (isLoading || !data) return <FullPageSpinner />;

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
