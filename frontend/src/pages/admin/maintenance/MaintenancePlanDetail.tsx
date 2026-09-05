import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, PlayCircle, Copy, PauseCircle, CheckCircle2 } from "lucide-react";
import {
  getMaintenancePlan,
  deleteMaintenancePlan,
  generateWorkOrderFromPlan,
  getMaintenancePlanIndicators,
  duplicateMaintenancePlan,
  updateMaintenancePlan,
} from "../../../api/maintenancePlans";
import { PageHeader } from "../../../components/PageHeader";
import { FullPageSpinner } from "../../../components/Spinner";
import { StatusBadge } from "../../../components/StatusBadge";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { EmptyState } from "../../../components/EmptyState";
import { useCmms } from "../../../lib/cmms";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";
import { clientDisplayName, formatDate, formatCurrency } from "../../../lib/format";

export default function MaintenancePlanDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { canManage, isClient, base } = useCmms();
  const queryClient = useQueryClient();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: plan, isLoading } = useQuery({ queryKey: ["maintenance-plan", id], queryFn: () => getMaintenancePlan(id) });
  const { data: indicators } = useQuery({
    queryKey: ["maintenance-plan-indicators", id],
    queryFn: () => getMaintenancePlanIndicators(id),
  });

  async function handleStatus(status: "ACTIVE" | "SUSPENDED" | "CLOSED", mensagem: string) {
    setBusy(true);
    try {
      await updateMaintenancePlan(id, { status });
      notify("success", mensagem);
      queryClient.invalidateQueries({ queryKey: ["maintenance-plan", id] });
      queryClient.invalidateQueries({ queryKey: ["maintenance-plan-indicators", id] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleDuplicate() {
    setBusy(true);
    try {
      const copia = await duplicateMaintenancePlan(id);
      notify("success", `Plano ${copia.code ?? ""} criado como copia - ajuste e ative quando quiser.`);
      navigate(`${base}/planos/${copia.id}`);
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteMaintenancePlan(id);
      notify("success", "Plano removido.");
      navigate(`${base}/planos`);
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const workOrder = await generateWorkOrderFromPlan(id);
      notify("success", `OS ${workOrder.number} gerada.`);
      navigate(`${base}/ordens/${workOrder.id}`);
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setGenerating(false);
    }
  }

  if (isLoading || !plan) return <FullPageSpinner />;

  const due = plan.derivedStatus === "DUE_SOON" || plan.derivedStatus === "EXPIRED";

  return (
    <div>
      <PageHeader
        title={plan.name}
        description={isClient ? `Ativo: ${plan.instrument?.tag ?? "-"}` : `Cliente: ${clientDisplayName(plan.client)} - Ativo: ${plan.instrument?.tag ?? "-"}`}
        breadcrumbs={[
          { label: "RLP Maintenance CMMS", to: base },
          { label: "Planos", to: `${base}/planos` },
          { label: plan.name },
        ]}
        actions={
          canManage && (
            <>
              {due && plan.status === "ACTIVE" && (
                <button className="btn-primary" onClick={handleGenerate} disabled={generating}>
                  <PlayCircle className="h-4 w-4" /> {generating ? "Gerando..." : "Gerar OS"}
                </button>
              )}
              <button className="btn-outline" onClick={() => navigate(`${base}/planos/${id}/editar`)}>
                <Pencil className="h-4 w-4" /> Editar
              </button>
              <button className="btn-outline" onClick={handleDuplicate} disabled={busy}>
                <Copy className="h-4 w-4" /> Duplicar
              </button>
              {plan.status === "ACTIVE" ? (
                <button className="btn-outline" onClick={() => handleStatus("SUSPENDED", "Plano suspenso - para de gerar OS.")} disabled={busy}>
                  <PauseCircle className="h-4 w-4" /> Suspender
                </button>
              ) : plan.status !== "CLOSED" ? (
                <button className="btn-outline" onClick={() => handleStatus("ACTIVE", "Plano reativado.")} disabled={busy}>
                  <CheckCircle2 className="h-4 w-4" /> Reativar
                </button>
              ) : null}
              <button className="btn-danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4" /> Remover
              </button>
            </>
          )
        }
      />

      {indicators && (
        <div className="mb-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <IndicadorCard
              rotulo="Cumprimento do plano"
              valor={indicators.compliancePct != null ? `${indicators.compliancePct}%` : "Dados insuficientes"}
              detalhe={
                indicators.totals.completed > 0
                  ? `${indicators.totals.completed} OS concluida(s)`
                  : "Nenhuma OS concluida ainda"
              }
            />
            <IndicadorCard
              rotulo="Atrasadas"
              valor={String(indicators.totals.overdue)}
              detalhe={`${indicators.totals.open} em aberto`}
              alerta={indicators.totals.overdue > 0}
            />
            <IndicadorCard
              rotulo="HH planejada x realizada"
              valor={
                indicators.laborHours.actual != null
                  ? `${indicators.laborHours.planned ?? "-"}h / ${indicators.laborHours.actual}h`
                  : "Sem apontamento"
              }
            />
            <IndicadorCard
              rotulo="Falhas achadas na preventiva"
              valor={String(indicators.failuresFound)}
              detalhe="Corretivas abertas por anomalia"
              alerta={indicators.failuresFound > 0}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <IndicadorCard rotulo="Ultima execucao" valor={formatDate(indicators.lastExecutionAt) || "Nunca executado"} />
            <IndicadorCard rotulo="Proxima geracao da OS" valor={formatDate(indicators.nextGenerationDate) || "-"} />
            <IndicadorCard rotulo="Proximo vencimento" valor={formatDate(indicators.nextDueDate) || "-"} />
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-navy-900">Custo planejado x realizado</h2>
            {indicators.cost.tracked ? (
              <dl className="grid gap-3 text-sm sm:grid-cols-4">
                <div><dt className="text-xs text-graphite-400">Pecas</dt><dd className="font-medium">{formatCurrency(indicators.cost.parts)}</dd></div>
                <div><dt className="text-xs text-graphite-400">Mao de obra</dt><dd className="font-medium">{formatCurrency(indicators.cost.labor)}</dd></div>
                <div><dt className="text-xs text-graphite-400">Terceiros</dt><dd className="font-medium">{formatCurrency(indicators.cost.thirdParty)}</dd></div>
                <div><dt className="text-xs text-graphite-400">Total realizado</dt><dd className="font-semibold text-navy-900">{formatCurrency(indicators.cost.total)}</dd></div>
              </dl>
            ) : (
              <p className="text-sm text-graphite-500">
                Sem OS concluida com custo apontado - o custo aparece quando a primeira execucao for encerrada.
              </p>
            )}

            {/* Planejado ao lado do realizado. So material entra no planejado: o plano
                guarda a HH prevista, mas nao um valor/hora - e uma taxa media inventada
                faria a comparacao confrontar um numero medido com um chute. */}
            <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm">
              {indicators.cost.planned != null ? (
                <>
                  <p className="text-graphite-700">
                    Material previsto: <span className="font-semibold text-navy-900">{formatCurrency(indicators.cost.planned)}</span>
                    {indicators.cost.plannedPerCycle != null && (
                      <span className="text-graphite-500"> ({formatCurrency(indicators.cost.plannedPerCycle)} por execucao)</span>
                    )}
                    {indicators.cost.tracked && (
                      <>
                        {" x realizado em pecas: "}
                        <span className="font-semibold text-navy-900">{formatCurrency(indicators.cost.parts)}</span>
                      </>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-graphite-500">
                    O planejado cobre so o material previsto. Mao de obra planejada aparece em horas no cartao
                    "HH planejada x realizada" - o plano nao guarda valor/hora.
                  </p>
                </>
              ) : (
                <p className="text-xs text-graphite-500">
                  Sem custo planejado: o plano nao tem material previsto, ou alguma peca esta sem custo unitario
                  cadastrado no almoxarifado.
                </p>
              )}
            </div>
            {indicators.materialUsage.length > 0 && (
              <div className="mt-4">
                <p className="mb-1.5 text-xs uppercase tracking-wide text-graphite-400">Consumo de material acumulado</p>
                <ul className="divide-y divide-gray-100 text-sm">
                  {indicators.materialUsage.map((m) => (
                    <li key={m.name} className="flex justify-between py-1.5">
                      <span className="text-graphite-700">{m.name}</span>
                      <span className="font-medium text-navy-900">{m.quantity} {m.unit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card space-y-4 p-5 lg:col-span-2">
          <div className="flex items-center gap-2">
            <StatusBadge status={plan.active ? (plan.derivedStatus ?? "VALID") : "INACTIVE"} />
            {plan.description && <span className="text-sm text-graphite-500">{plan.description}</span>}
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info label="Disparo" value={plan.triggerType === "TIME" ? `A cada ${plan.frequencyDays} dias` : `Medidor: ${plan.meter?.name ?? "-"} (a cada ${plan.meterInterval} ${plan.meter?.unit ?? ""})`} />
            <Info label="Proximo vencimento" value={plan.triggerType === "TIME" ? formatDate(plan.nextDueDate) : "-"} />
            <Info label="Ultima geracao" value={formatDate(plan.lastGeneratedAt)} />
            <Info label="Responsavel" value={plan.responsible?.name ?? "-"} />
            <Info
              label="Tolerancia"
              value={plan.toleranceDaysBefore == null && plan.toleranceDaysAfter == null ? "-" : `${plan.toleranceDaysBefore ?? 0} dias antes / ${plan.toleranceDaysAfter ?? 0} dias depois`}
            />
            <Info label="HH prevista" value={plan.estimatedLaborHours != null ? `${plan.estimatedLaborHours}h` : "-"} />
            {plan.template && (
              <Info label="Modelo de origem" value={plan.template.name} />
            )}
          </dl>

          {plan.procedure && (
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-graphite-400">Procedimento</p>
              <p className="whitespace-pre-line text-sm text-graphite-700">{plan.procedure}</p>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-graphite-400">Checklist padrao</p>
            {plan.checklistTemplate.length === 0 ? (
              <p className="text-sm text-graphite-500">Nenhum item cadastrado.</p>
            ) : (
              <ul className="list-disc space-y-1 pl-5 text-sm text-graphite-700">
                {plan.checklistTemplate.map((c, i) => (
                  <li key={c.id ?? i}>{c.description}</li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-graphite-400">Materiais previstos</p>
            {!plan.parts || plan.parts.length === 0 ? (
              <p className="text-sm text-graphite-500">Nenhum material previsto.</p>
            ) : (
              <ul className="divide-y divide-gray-100 text-sm">
                {plan.parts.map((p, i) => (
                  <li key={p.id ?? i} className="flex items-center justify-between py-1.5">
                    <span className="text-graphite-700">{p.sparePart?.name ?? "-"}{p.sparePart?.code ? ` (${p.sparePart.code})` : ""}</span>
                    <span className="font-medium text-navy-900">{p.quantity} {p.sparePart?.unit ?? "un"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-navy-900">Ordens geradas</h2>
          {!plan.workOrders || plan.workOrders.length === 0 ? (
            <EmptyState title="Nenhuma OS gerada" description="Ainda nao foi gerada nenhuma ordem a partir deste plano." />
          ) : (
            <ul className="divide-y divide-gray-100">
              {plan.workOrders.map((w) => (
                <li key={w.id}>
                  <Link to={`${base}/ordens/${w.id}`} className="flex items-center justify-between py-2.5 text-sm hover:text-navy-700">
                    <span className="font-medium text-graphite-800">{w.number}</span>
                    <StatusBadge status={w.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Remover plano de manutencao"
        description="Tem certeza que deseja remover este plano? O historico de ordens de manutencao geradas sera preservado."
        confirmLabel="Remover"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function IndicadorCard({
  rotulo,
  valor,
  detalhe,
  alerta,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  alerta?: boolean;
}) {
  return (
    <div className={`card p-5 ${alerta ? "border-safety-yellow/40 bg-amber-50/30" : ""}`}>
      <p className="text-xs uppercase tracking-wide text-graphite-400">{rotulo}</p>
      <p className={`mt-1 text-xl font-bold ${alerta ? "text-safety-yellow-dark" : "text-navy-900"}`}>{valor}</p>
      {detalhe && <p className="mt-0.5 text-xs text-graphite-400">{detalhe}</p>}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-graphite-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-graphite-800">{value}</dd>
    </div>
  );
}
