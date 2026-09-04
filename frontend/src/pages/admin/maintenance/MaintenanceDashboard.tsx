import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Wrench, Gauge, ClipboardList, ClipboardPlus, ShieldCheck, Activity, TimerReset, Boxes, GitBranch, Radar, HardHat, Kanban, BarChart3, Search, CalendarDays, SlidersHorizontal } from "lucide-react";
import { getMaintenanceDashboard } from "../../../api/maintenanceWorkOrders";
import { listClients } from "../../../api/clients";
import { PageHeader } from "../../../components/PageHeader";
import { StatCard } from "../../../components/StatCard";
import { FullPageSpinner } from "../../../components/Spinner";
import { clientDisplayName } from "../../../lib/format";
import { useCmms } from "../../../lib/cmms";

export default function MaintenanceDashboard() {
  const { isClient, base, assetsBase, partsBase, laborBase } = useCmms();
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
        <Link to={`${base}/solicitacoes${clientId ? `?clientId=${clientId}` : ""}`} className="btn-outline">
          <ClipboardPlus className="h-4 w-4" /> Solicitacoes
        </Link>
        <Link to={`${base}/ordens${clientId ? `?clientId=${clientId}` : ""}`} className="btn-outline">
          <ClipboardList className="h-4 w-4" /> Ordens
        </Link>
        <Link to={`${base}/programacao`} className="btn-outline">
          <CalendarDays className="h-4 w-4" /> Programacao
        </Link>
        <Link to={`${base}/kanban${clientId ? `?clientId=${clientId}` : ""}`} className="btn-outline">
          <Kanban className="h-4 w-4" /> Kanban
        </Link>
        <Link to={`${base}/planos${clientId ? `?clientId=${clientId}` : ""}`} className="btn-outline">
          <ShieldCheck className="h-4 w-4" /> Planos preventivos
        </Link>
        <Link to={`${assetsBase}${clientId ? `?clientId=${clientId}` : ""}`} className="btn-outline">
          <Gauge className="h-4 w-4" /> Ativos
        </Link>
        <Link to={`${partsBase}${!isClient && clientId ? `?clientId=${clientId}` : ""}`} className="btn-outline">
          <Boxes className="h-4 w-4" /> Almoxarifado
        </Link>
        <Link to={`${assetsBase}/cadastros`} className="btn-outline">
          <SlidersHorizontal className="h-4 w-4" /> Cadastros
        </Link>
      </div>

      {/* Segunda linha: analise e visoes secundarias - usadas menos que a operacao acima. */}
      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <Link to={`${base}/pareto${clientId ? `?clientId=${clientId}` : ""}`} className="inline-flex items-center gap-1.5 text-graphite-600 hover:text-navy-700">
          <BarChart3 className="h-4 w-4" /> Pareto de falhas
        </Link>
        <Link to={`${base}/rca${clientId ? `?clientId=${clientId}` : ""}`} className="inline-flex items-center gap-1.5 text-graphite-600 hover:text-navy-700">
          <Search className="h-4 w-4" /> RCA / 5 Porques
        </Link>
        <Link to={`${base}/arvore${clientId ? `?clientId=${clientId}` : ""}`} className="inline-flex items-center gap-1.5 text-graphite-600 hover:text-navy-700">
          <GitBranch className="h-4 w-4" /> Arvore de ativos
        </Link>
        <Link to={`${base}/ordens?type=PREDICTIVE${clientId ? `&clientId=${clientId}` : ""}`} className="inline-flex items-center gap-1.5 text-graphite-600 hover:text-navy-700">
          <Radar className="h-4 w-4" /> Manutencao preditiva
        </Link>
        <Link to={`${laborBase}${!isClient && clientId ? `?clientId=${clientId}` : ""}`} className="inline-flex items-center gap-1.5 text-graphite-600 hover:text-navy-700">
          <HardHat className="h-4 w-4" /> Mao de obra
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

          <h2 className="mb-3 mt-8 font-semibold text-navy-900">PCM - planejamento e controle</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card p-5">
              <p className="text-xs uppercase tracking-wide text-graphite-400">Backlog</p>
              <p className="mt-1 text-2xl font-bold text-navy-900">{data.pcm.backlogHours}h</p>
              {data.pcm.openWithoutEstimate > 0 && (
                <p className="mt-0.5 text-xs text-graphite-400">{data.pcm.openWithoutEstimate} OS em aberto sem HH prevista (fora da conta)</p>
              )}
            </div>
            <div className={`card p-5 ${data.pcm.overdue > 0 ? "border-safety-red/30 bg-red-50/40" : ""}`}>
              <p className="text-xs uppercase tracking-wide text-graphite-400">Atrasadas</p>
              <p className={`mt-1 text-2xl font-bold ${data.pcm.overdue > 0 ? "text-safety-red" : "text-navy-900"}`}>{data.pcm.overdue}</p>
            </div>
            <div className={`card p-5 ${data.pcm.emergency > 0 ? "border-safety-red/30 bg-red-50/40" : ""}`}>
              <p className="text-xs uppercase tracking-wide text-graphite-400">Emergenciais (criticas, em aberto)</p>
              <p className={`mt-1 text-2xl font-bold ${data.pcm.emergency > 0 ? "text-safety-red" : "text-navy-900"}`}>{data.pcm.emergency}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs uppercase tracking-wide text-graphite-400">Aderencia a programacao</p>
              <p className="mt-1 text-2xl font-bold text-navy-900">
                {data.pcm.scheduleAdherencePct != null ? `${data.pcm.scheduleAdherencePct}%` : "Dados insuficientes"}
              </p>
              {data.pcm.scheduleAdherencePct != null && (
                <p className="mt-0.5 text-xs text-graphite-400">{data.pcm.scheduledCompletedCount} OS programadas concluidas no periodo</p>
              )}
            </div>
            <div className="card p-5">
              <p className="text-xs uppercase tracking-wide text-graphite-400">Aguardando material</p>
              <p className="mt-1 text-2xl font-bold text-navy-900">{data.pcm.awaitingMaterial}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs uppercase tracking-wide text-graphite-400">Aguardando liberacao</p>
              <p className="mt-1 text-2xl font-bold text-navy-900">{data.pcm.awaitingRelease}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs uppercase tracking-wide text-graphite-400">Aguardando parada</p>
              <p className="mt-1 text-2xl font-bold text-navy-900">{data.pcm.awaitingStoppage}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs uppercase tracking-wide text-graphite-400">HH prevista x realizada (concluidas)</p>
              <p className="mt-1 text-2xl font-bold text-navy-900">{data.pcm.plannedHoursCompleted}h / {data.pcm.actualHoursCompleted}h</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
