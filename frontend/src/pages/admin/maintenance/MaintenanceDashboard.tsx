import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Wrench, Gauge, ClipboardList, ShieldCheck, Activity, TimerReset, ListChecks, Boxes, GitBranch, Radar } from "lucide-react";
import { getMaintenanceDashboard } from "../../../api/maintenanceWorkOrders";
import { listClients } from "../../../api/clients";
import { PageHeader } from "../../../components/PageHeader";
import { StatCard } from "../../../components/StatCard";
import { FullPageSpinner } from "../../../components/Spinner";
import { clientDisplayName } from "../../../lib/format";
import { useCmms } from "../../../lib/cmms";

export default function MaintenanceDashboard() {
  const { isClient, base, assetsBase, partsBase } = useCmms();
  const [clientId, setClientId] = useState("");

  const { data: clients } = useQuery({
    queryKey: ["clients-picker-cmms"],
    queryFn: () => listClients({ pageSize: 200, service: "CMMS_MAINTENANCE" }),
    enabled: !isClient,
  });
  const { data, isLoading } = useQuery({
    queryKey: ["maintenance-dashboard", clientId],
    queryFn: () => getMaintenanceDashboard({ clientId: clientId || undefined }),
  });

  return (
    <div>
      <PageHeader
        title="RLP Maintenance CMMS"
        description="Ciclo completo de manutencao - planos preventivos, ordens, pecas e indicadores (ultimos 90 dias)"
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        {!isClient && (
          <select className="input sm:w-72" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Todos os clientes</option>
            {(clients?.items ?? []).map((c) => (
              <option key={c.id} value={c.id}>{clientDisplayName(c)}</option>
            ))}
          </select>
        )}
        <Link to={`${assetsBase}${clientId ? `?clientId=${clientId}` : ""}`} className="btn-outline">
          <Gauge className="h-4 w-4" /> Ativos
        </Link>
        <Link to={`${base}/arvore${clientId ? `?clientId=${clientId}` : ""}`} className="btn-outline">
          <GitBranch className="h-4 w-4" /> Arvore de ativos
        </Link>
        <Link to={`${base}/ordens${clientId ? `?clientId=${clientId}` : ""}`} className="btn-outline">
          <ClipboardList className="h-4 w-4" /> Ordens de manutencao
        </Link>
        <Link to={`${base}/planos${clientId ? `?clientId=${clientId}` : ""}`} className="btn-outline">
          <ShieldCheck className="h-4 w-4" /> Planos de manutencao
        </Link>
        <Link to={`${base}/ordens?type=PREDICTIVE${clientId ? `&clientId=${clientId}` : ""}`} className="btn-outline">
          <Radar className="h-4 w-4" /> Manutencao preditiva
        </Link>
        <Link to={`${base}/falhas`} className="btn-outline">
          <ListChecks className="h-4 w-4" /> Codigos de falha
        </Link>
        <Link to={`${partsBase}${!isClient && clientId ? `?clientId=${clientId}` : ""}`} className="btn-outline">
          <Boxes className="h-4 w-4" /> Almoxarifado
        </Link>
      </div>

      {isLoading || !data ? (
        <FullPageSpinner />
      ) : (
        <>
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
              <p className="text-xs uppercase tracking-wide text-graphite-400">Preditivas (periodo)</p>
              <p className="mt-1 text-2xl font-bold text-navy-900">{data.totals.predictive}</p>
              {data.totals.predictive > 0 && (
                <p className="mt-0.5 text-xs text-graphite-400">{data.totals.predictiveAutoOpened} abertas sozinhas por medidor</p>
              )}
            </div>
            <div className="card p-5">
              <p className="text-xs uppercase tracking-wide text-graphite-400">Total de OS (periodo)</p>
              <p className="mt-1 text-2xl font-bold text-navy-900">{data.totals.workOrders}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
