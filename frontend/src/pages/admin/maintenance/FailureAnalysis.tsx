import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getFailureAnalysis } from "../../../api/maintenanceWorkOrders";
import { listClients } from "../../../api/clients";
import type { FailureAnalysisBucket } from "../../../api/types";
import { PageHeader } from "../../../components/PageHeader";
import { StatCard } from "../../../components/StatCard";
import { FullPageSpinner } from "../../../components/Spinner";
import { EmptyState } from "../../../components/EmptyState";
import { clientDisplayName, formatCurrency } from "../../../lib/format";
import { useCmms } from "../../../lib/cmms";
import { AlertTriangle, Siren, HelpCircle, Repeat } from "lucide-react";

/** Pareto de falhas: as OS corretivas do periodo agrupadas por codigo de falha, ativo
 * (ranking de mais problematicos) e area - pra responder "o que mais pesa" de tres
 * angulos. Barras simples em CSS, sem biblioteca de grafico so pra isso. */
export default function FailureAnalysis() {
  const { isClient, base } = useCmms();
  const [clientId, setClientId] = useState("");

  const { data: clients } = useQuery({
    queryKey: ["clients-picker-cmms"],
    queryFn: () => listClients({ pageSize: 200, service: "CMMS_MAINTENANCE" }),
    enabled: !isClient,
  });
  const { data, isLoading } = useQuery({
    queryKey: ["failure-analysis", clientId],
    queryFn: () => getFailureAnalysis({ clientId: clientId || undefined }),
  });

  return (
    <div>
      <PageHeader
        title="Pareto de falhas"
        description="OS corretivas dos ultimos 90 dias, agrupadas por codigo de falha, ativo e area"
        breadcrumbs={[{ label: "RLP Maintenance CMMS", to: base }, { label: "Pareto de falhas" }]}
      />

      {!isClient && (
        <div className="mb-6">
          <select className="input sm:w-72" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Todos os clientes</option>
            {(clients?.items ?? []).map((c) => (
              <option key={c.id} value={c.id}>{clientDisplayName(c)}</option>
            ))}
          </select>
        </div>
      )}

      {isLoading || !data ? (
        <FullPageSpinner />
      ) : data.totalCorrective === 0 ? (
        <EmptyState title="Nenhuma OS corretiva no periodo" description="O Pareto aparece assim que houver ordens corretivas concluidas ou em andamento nos ultimos 90 dias." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="OS corretivas (periodo)" value={data.totalCorrective} icon={AlertTriangle} tone="navy" />
            <StatCard label="Emergenciais (criticas)" value={data.emergency} icon={Siren} tone="red" />
            <StatCard label="Sem codigo de falha" value={data.withoutFailureCode} icon={HelpCircle} tone="yellow" />
            <StatCard label="Codigos recorrentes" value={data.recurringFailureCodes} icon={Repeat} tone="yellow" />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <ParetoSection title="Por codigo de falha" buckets={data.byFailureCode} />
            <ParetoSection title="Por ativo (ranking)" buckets={data.byInstrument} />
            <ParetoSection title="Por area" buckets={data.byArea} />
          </div>
        </>
      )}
    </div>
  );
}

function ParetoSection({ title, buckets }: { title: string; buckets: FailureAnalysisBucket[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <div className="card p-5">
      <h2 className="mb-4 font-semibold text-navy-900">{title}</h2>
      {buckets.length === 0 ? (
        <p className="text-sm text-graphite-500">Sem dados suficientes.</p>
      ) : (
        <ul className="space-y-3">
          {buckets.slice(0, 10).map((b) => (
            <li key={b.key}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="line-clamp-1 font-medium text-graphite-800">{b.label}</span>
                <span className="shrink-0 text-graphite-500">
                  {b.count}x{b.downtimeHours > 0 && ` · ${b.downtimeHours}h parado`}{b.cost > 0 && ` · ${formatCurrency(b.cost)}`}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100">
                <div className="h-1.5 rounded-full bg-navy-600" style={{ width: `${(b.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
