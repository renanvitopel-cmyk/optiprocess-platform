import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Trash2, PlayCircle } from "lucide-react";
import { getMaintenancePlan, deleteMaintenancePlan, generateWorkOrderFromPlan } from "../../../api/maintenancePlans";
import { PageHeader } from "../../../components/PageHeader";
import { FullPageSpinner } from "../../../components/Spinner";
import { StatusBadge } from "../../../components/StatusBadge";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { EmptyState } from "../../../components/EmptyState";
import { useCmms } from "../../../lib/cmms";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";
import { clientDisplayName, formatDate } from "../../../lib/format";

export default function MaintenancePlanDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { canManage, isClient, base } = useCmms();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generating, setGenerating] = useState(false);

  const { data: plan, isLoading } = useQuery({ queryKey: ["maintenance-plan", id], queryFn: () => getMaintenancePlan(id) });

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
              {due && plan.active && (
                <button className="btn-primary" onClick={handleGenerate} disabled={generating}>
                  <PlayCircle className="h-4 w-4" /> {generating ? "Gerando..." : "Gerar OS"}
                </button>
              )}
              <button className="btn-outline" onClick={() => navigate(`${base}/planos/${id}/editar`)}>
                <Pencil className="h-4 w-4" /> Editar
              </button>
              <button className="btn-danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4" /> Remover
              </button>
            </>
          )
        }
      />

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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-graphite-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-graphite-800">{value}</dd>
    </div>
  );
}
