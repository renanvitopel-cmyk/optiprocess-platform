import { useQuery } from "@tanstack/react-query";
import { Users, Gauge, BadgeCheck, CircleSlash } from "lucide-react";
import { getOwnClient } from "../../api/clients";
import { PageHeader } from "../../components/PageHeader";
import { FullPageSpinner } from "../../components/Spinner";
import { EmptyState } from "../../components/EmptyState";
import { formatCurrency, formatDate } from "../../lib/format";

/** Barra de uso de um limite do contrato. Sem limite definido nao existe percentual - e'
 * "ilimitado", nao 0% nem 100%. */
function Uso({ rotulo, atual, limite, icone: Icone }: { rotulo: string; atual: number; limite: number | null; icone: typeof Users }) {
  const semLimite = limite == null;
  const restantes = semLimite ? null : Math.max(0, limite - atual);
  const pct = semLimite ? null : Math.min(100, Math.round((atual / Math.max(1, limite)) * 100));
  const apertado = pct != null && pct >= 90;

  return (
    <div className={`card p-5 ${apertado ? "border-safety-yellow/50" : ""}`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-graphite-400">
        <Icone className="h-4 w-4" /> {rotulo}
      </div>
      <p className="mt-1 text-2xl font-bold text-navy-900">
        {atual}
        {!semLimite && <span className="text-base font-medium text-graphite-400"> / {limite}</span>}
      </p>

      {semLimite ? (
        <p className="mt-1 text-xs text-graphite-500">Sem limite no seu contrato.</p>
      ) : (
        <>
          <div className="mt-2 h-2 rounded-full bg-gray-100">
            <div
              className={`h-2 rounded-full ${apertado ? "bg-safety-yellow" : "bg-navy-600"}`}
              style={{ width: `${Math.max(2, pct ?? 0)}%` }}
            />
          </div>
          <p className={`mt-1.5 text-xs ${restantes === 0 ? "font-medium text-safety-red" : "text-graphite-500"}`}>
            {restantes === 0
              ? "Limite atingido - fale com a OptiProcess para ampliar."
              : `Ainda cabem ${restantes}.`}
          </p>
        </>
      )}
    </div>
  );
}

/** Contrato do cliente: qual plano, o que ele da direito, quem ja usa e quanto ainda cabe.
 * Antes o cliente so descobria o limite quando um cadastro era recusado. */
export default function PortalContract() {
  const { data: empresa, isLoading } = useQuery({ queryKey: ["own-client"], queryFn: getOwnClient });

  if (isLoading) return <FullPageSpinner />;
  if (!empresa) return <EmptyState title="Empresa nao encontrada" description="Nao foi possivel carregar os dados do seu contrato." />;

  const plano = empresa.plan;
  const uso = empresa.planUsage;
  const usuarios = empresa.users ?? [];

  return (
    <div>
      <PageHeader
        title="Meu contrato"
        description="Plano contratado, acessos liberados e quanto ainda cabe"
        breadcrumbs={[{ label: "Portal", to: "/portal" }, { label: "Meu contrato" }]}
      />

      <div className="card mb-6 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-graphite-400">Plano contratado</p>
            <p className="mt-0.5 text-xl font-bold text-navy-900">{plano?.name ?? "Sem plano atribuido"}</p>
            {plano?.description && <p className="mt-1 text-sm text-graphite-600">{plano.description}</p>}
            {!plano && (
              <p className="mt-1 text-sm text-graphite-500">
                Sua empresa esta sem plano definido no sistema - nao ha limite de acessos nem de ativos aplicado.
                Para contratar ou ajustar, fale com a OptiProcess.
              </p>
            )}
          </div>
          {plano?.priceMonthly != null && (
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-graphite-400">Mensalidade</p>
              <p className="mt-0.5 text-lg font-semibold text-navy-900">{formatCurrency(plano.priceMonthly)}</p>
            </div>
          )}
        </div>

        {plano && plano.features.length > 0 && (
          <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
            {plano.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-graphite-700">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-safety-green" /> {f}
              </li>
            ))}
          </ul>
        )}

        {empresa.contractedServices?.length > 0 && (
          <p className="mt-4 text-xs text-graphite-500">
            Servicos contratados: {empresa.contractedServices.length} area(s) liberada(s) no seu portal.
          </p>
        )}
      </div>

      {uso && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <Uso rotulo="Acessos (usuarios)" atual={uso.users.current} limite={uso.users.limit} icone={Users} />
          <Uso rotulo="Ativos cadastrados" atual={uso.instruments.current} limite={uso.instruments.limit} icone={Gauge} />
        </div>
      )}

      {uso?.requesters != null && (
        <div className="mb-8 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-sm text-graphite-700">
            <span className="font-semibold text-navy-900">{uso.requesters}</span> solicitante(s) cadastrado(s) - eles
            abrem e acompanham as proprias solicitacoes de servico e <span className="font-medium">nao consomem vaga</span>{" "}
            do plano, em qualquer plano.
          </p>
        </div>
      )}

      <div>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold text-navy-900">Usuarios da sua empresa</h2>
          <p className="text-xs text-graphite-500">
            Para liberar um acesso novo ou remover alguem, fale com a OptiProcess.
          </p>
        </div>

        {usuarios.length === 0 ? (
          <EmptyState title="Nenhum usuario cadastrado" description="Nenhum acesso ao portal foi liberado ainda." />
        ) : (
          <div className="card divide-y divide-gray-100">
            {usuarios.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-medium text-navy-900">{u.name}</p>
                  <p className="text-xs text-graphite-500">{u.email}</p>
                </div>
                <div className="shrink-0 text-right">
                  {u.active ? (
                    <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-safety-green-dark">
                      Ativo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-graphite-500">
                      <CircleSlash className="h-3 w-3" /> Inativo
                    </span>
                  )}
                  <p className="mt-1 text-xs text-graphite-400">
                    {/* "Nunca acessou" e' informacao util: acesso liberado e nao usado
                        ocupa uma vaga do contrato sem entregar nada. */}
                    {u.lastLoginAt ? `Ultimo acesso: ${formatDate(u.lastLoginAt)}` : "Nunca acessou"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
