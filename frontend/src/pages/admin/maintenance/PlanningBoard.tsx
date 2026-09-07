import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { UserPlus, Clock, PlayCircle, CheckCircle2, Search } from "lucide-react";
import { listMaintenanceWorkOrders } from "../../../api/maintenanceWorkOrders";
import { listClients } from "../../../api/clients";
import type { MaintenanceWorkOrder } from "../../../api/types";
import { PageHeader } from "../../../components/PageHeader";
import { StatusBadge } from "../../../components/StatusBadge";
import { EmptyState } from "../../../components/EmptyState";
import { FullPageSpinner } from "../../../components/Spinner";
import { clientDisplayName, formatDate } from "../../../lib/format";
import { TIPOS_DE_OS } from "../../../lib/maintenanceLabels";
import { useCmms } from "../../../lib/cmms";

/**
 * Painel de planejamento: onde cada ordem esta na fila, em quatro faixas.
 *
 * A programacao responde "quem faz o que, em que dia". O Kanban responde "em que status
 * cada uma esta", com dez colunas. Faltava a pergunta que o planejador faz primeiro, de
 * manha: o que ainda nao tem dono, o que esta com dono mas parado, o que ja pode ser
 * executado e o que saiu. Quatro faixas, nessa ordem, porque e' a ordem em que o trabalho
 * anda - e a primeira e' a que exige acao dele.
 */
const FAIXAS = [
  {
    id: "sem-dono",
    titulo: "Sem responsavel",
    explicacao: "Ninguem assumiu e ninguem foi atribuido - e' por aqui que o dia comeca.",
    icone: UserPlus,
    tom: "border-safety-yellow/50 bg-safety-yellow/5",
  },
  {
    id: "pendente",
    titulo: "Pendente",
    explicacao: "Tem responsavel, mas ainda nao pode ser executada (aguardando material, parada, liberacao...).",
    icone: Clock,
    tom: "border-gray-200",
  },
  {
    id: "liberada",
    titulo: "Liberada",
    explicacao: "Pode ser executada agora - ou ja esta em execucao.",
    icone: PlayCircle,
    tom: "border-navy-200 bg-navy-50/40",
  },
  {
    id: "concluida",
    titulo: "Concluida",
    explicacao: "Encerrada. Fica aqui como o que saiu da fila no periodo.",
    icone: CheckCircle2,
    tom: "border-green-200 bg-green-50/40",
  },
] as const;

type FaixaId = (typeof FAIXAS)[number]["id"];

/** Em qual faixa a ordem cai. A regra e' de fila, nao de status: "sem responsavel" vence
 * o status, porque uma OS sem dono nao anda por mais bem classificada que esteja. */
function faixaDaOrdem(os: MaintenanceWorkOrder): FaixaId | null {
  if (os.status === "COMPLETED") return "concluida";
  if (os.status === "CANCELED") return null; // cancelada saiu da fila e nao volta
  if (!os.assignedResourceId) return "sem-dono";
  if (os.status === "RELEASED" || os.status === "IN_PROGRESS") return "liberada";
  return "pendente";
}

function Cartao({ os, base }: { os: MaintenanceWorkOrder; base: string }) {
  return (
    <Link
      to={`${base}/ordens/${os.id}`}
      className="block rounded-lg border border-gray-200 bg-white p-3 hover:border-navy-300 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-navy-900">{os.number}</span>
        <StatusBadge status={os.priority} />
      </div>
      <p className="mt-0.5 line-clamp-2 text-sm text-graphite-700">{os.title || os.description}</p>
      <p className="mt-1 text-xs text-graphite-400">
        {os.instrument?.tag ?? os.instrument?.description ?? "sem ativo"} - {TIPOS_DE_OS[os.type] ?? os.type}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className={os.assignedResource ? "text-graphite-600" : "font-medium text-safety-yellow-dark"}>
          {os.assignedResource?.name ?? "sem responsavel"}
        </span>
        <span className="text-graphite-400">
          {os.scheduledDate ? formatDate(os.scheduledDate) : os.completedAt ? formatDate(os.completedAt) : "sem data"}
        </span>
      </div>
    </Link>
  );
}

export default function PlanningBoard() {
  const { isClient, ownClientId, base } = useCmms();
  const [clientId, setClientId] = useState(ownClientId ?? "");
  const [busca, setBusca] = useState("");

  const { data: clients } = useQuery({
    queryKey: ["clients-picker-cmms"],
    queryFn: () => listClients({ pageSize: 200, service: "CMMS_MAINTENANCE" }),
    enabled: !isClient,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["planejamento", clientId],
    // pageSize alto de proposito: o painel so faz sentido com a fila inteira a vista -
    // paginar um quadro de planejamento esconderia justamente o que falta fazer.
    queryFn: () => listMaintenanceWorkOrders({ clientId: clientId || undefined, pageSize: 300 }),
    enabled: isClient || !!clientId,
  });

  const termo = busca.trim().toLowerCase();
  const ordens = (data?.items ?? []).filter(
    (os) =>
      !termo ||
      [os.number, os.title, os.description, os.instrument?.tag, os.assignedResource?.name]
        .some((campo) => campo?.toLowerCase().includes(termo)),
  );

  const porFaixa = new Map<FaixaId, MaintenanceWorkOrder[]>();
  for (const os of ordens) {
    const faixa = faixaDaOrdem(os);
    if (!faixa) continue;
    porFaixa.set(faixa, [...(porFaixa.get(faixa) ?? []), os]);
  }

  return (
    <div>
      <PageHeader
        title="Planejamento"
        description="Onde cada ordem esta na fila - o que falta ter dono, o que esta parado, o que pode ser executado e o que saiu"
        breadcrumbs={[{ label: "RLP Maintenance CMMS", to: base }, { label: "Planejamento" }]}
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        {!isClient && (
          <select className="input sm:w-72" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Selecione o cliente</option>
            {(clients?.items ?? []).map((c) => (
              <option key={c.id} value={c.id}>{clientDisplayName(c)}</option>
            ))}
          </select>
        )}
        {(isClient || clientId) && (
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
            <input
              className="input pl-9"
              placeholder="Buscar por numero, ativo, servico ou responsavel..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        )}
      </div>

      {!isClient && !clientId ? (
        <EmptyState title="Selecione um cliente" description="O planejamento e' da fila de cada empresa." />
      ) : isLoading ? (
        <FullPageSpinner />
      ) : (
        <div className="space-y-5">
          {FAIXAS.map((faixa) => {
            const lista = porFaixa.get(faixa.id) ?? [];
            const Icone = faixa.icone;
            return (
              <section key={faixa.id} className={`rounded-xl border p-4 ${faixa.tom}`}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 className="flex items-center gap-2 font-semibold text-navy-900">
                    <Icone className="h-4 w-4 text-navy-600" /> {faixa.titulo}
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-graphite-600">
                      {lista.length}
                    </span>
                  </h2>
                  <p className="text-xs text-graphite-500">{faixa.explicacao}</p>
                </div>

                {lista.length === 0 ? (
                  <p className="mt-3 text-sm text-graphite-400">Nenhuma ordem nesta faixa.</p>
                ) : (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {lista.map((os) => (
                      <Cartao key={os.id} os={os} base={base} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
