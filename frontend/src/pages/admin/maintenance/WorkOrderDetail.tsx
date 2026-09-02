import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, PlayCircle, CheckCircle2, Plus, X } from "lucide-react";
import {
  getMaintenanceWorkOrder,
  deleteMaintenanceWorkOrder,
  startMaintenanceWorkOrder,
  completeMaintenanceWorkOrder,
  updateChecklistItem,
  addWorkOrderPart,
  removeWorkOrderPart,
} from "../../../api/maintenanceWorkOrders";
import { listSpareParts } from "../../../api/spareParts";
import { listAssetParts } from "../../../api/instruments";
import type { ChecklistItemResult } from "../../../api/types";
import { PageHeader } from "../../../components/PageHeader";
import { FullPageSpinner } from "../../../components/Spinner";
import { StatusBadge } from "../../../components/StatusBadge";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { WorkOrderAttachments } from "./WorkOrderAttachments";
import { useCmms } from "../../../lib/cmms";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";
import { clientDisplayName, formatDateTime } from "../../../lib/format";

const RESULT_OPTIONS: { value: ChecklistItemResult; label: string; tone: string }[] = [
  { value: "OK", label: "OK", tone: "bg-green-50 text-safety-green-dark border-green-200" },
  { value: "NOT_OK", label: "Nao OK", tone: "bg-red-50 text-safety-red border-red-200" },
  { value: "NA", label: "N/A", tone: "bg-graphite-100 text-graphite-600 border-graphite-200" },
];

const TYPE_LABELS: Record<string, string> = { PREVENTIVE: "Preventiva", CORRECTIVE: "Corretiva", PREDICTIVE: "Preditiva" };
const PRIORITY_LABELS: Record<string, string> = { LOW: "Baixa", MEDIUM: "Media", HIGH: "Alta", CRITICAL: "Critica" };

export default function WorkOrderDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const { canManage, isClient, base } = useCmms();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [partSparePartId, setPartSparePartId] = useState("");
  const [partQty, setPartQty] = useState(1);

  const { data: workOrder, isLoading } = useQuery({ queryKey: ["maintenance-work-order", id], queryFn: () => getMaintenanceWorkOrder(id) });
  const { data: spareParts } = useQuery({
    queryKey: ["spare-parts-picker", workOrder?.clientId],
    queryFn: () => listSpareParts({ clientId: workOrder!.clientId, active: true, pageSize: 200 }),
    enabled: !!workOrder?.clientId,
  });
  const { data: assetParts } = useQuery({
    queryKey: ["instrument-asset-parts", workOrder?.instrumentId],
    queryFn: () => listAssetParts(workOrder!.instrumentId),
    enabled: !!workOrder?.instrumentId,
  });

  // Prioriza na lista as pecas ja cadastradas no BOM do ativo desta OS.
  const bomIds = new Set((assetParts ?? []).map((a) => a.sparePartId));
  const bomOptions = (spareParts?.items ?? []).filter((p) => bomIds.has(p.id));
  const otherOptions = (spareParts?.items ?? []).filter((p) => !bomIds.has(p.id));

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["maintenance-work-order", id] });
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteMaintenanceWorkOrder(id);
      notify("success", "OS removida.");
      navigate(`${base}/ordens`);
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  }

  async function handleStart() {
    setBusy(true);
    try {
      await startMaintenanceWorkOrder(id);
      notify("success", "OS iniciada.");
      invalidate();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete() {
    setBusy(true);
    try {
      await completeMaintenanceWorkOrder(id);
      notify("success", "OS concluida.");
      invalidate();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleChecklistResult(itemId: string, result: ChecklistItemResult) {
    try {
      await updateChecklistItem(id, itemId, { result });
      invalidate();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function handleAddPart() {
    if (!partSparePartId || partQty < 1) return;
    setBusy(true);
    try {
      await addWorkOrderPart(id, { sparePartId: partSparePartId, quantity: partQty });
      notify("success", "Peca registrada.");
      setPartSparePartId("");
      setPartQty(1);
      invalidate();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemovePart(movementId: string) {
    setBusy(true);
    try {
      await removeWorkOrderPart(id, movementId);
      notify("success", "Peca removida e estoque estornado.");
      invalidate();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (isLoading || !workOrder) return <FullPageSpinner />;

  const isCompleted = workOrder.status === "COMPLETED";

  return (
    <div>
      <PageHeader
        title={workOrder.number}
        description={isClient ? `Ativo: ${workOrder.instrument?.tag ?? "-"}` : `${clientDisplayName(workOrder.client)} - Ativo: ${workOrder.instrument?.tag ?? "-"}`}
        breadcrumbs={[
          { label: "RLP Maintenance CMMS", to: base },
          { label: "Ordens", to: `${base}/ordens` },
          { label: workOrder.number },
        ]}
        actions={
          canManage && (
            <>
              {!workOrder.startedAt && (
                <button className="btn-primary" onClick={handleStart} disabled={busy}>
                  <PlayCircle className="h-4 w-4" /> Iniciar
                </button>
              )}
              {workOrder.startedAt && !isCompleted && (
                <button className="btn-primary" onClick={handleComplete} disabled={busy}>
                  <CheckCircle2 className="h-4 w-4" /> Concluir
                </button>
              )}
              {!isCompleted && (
                <button className="btn-outline" onClick={() => navigate(`${base}/ordens/${id}/editar`)}>
                  <Pencil className="h-4 w-4" /> Editar
                </button>
              )}
              <button className="btn-danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4" /> Remover
              </button>
            </>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card space-y-4 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={workOrder.status} />
              <span className="rounded-full border border-navy-200 bg-navy-50 px-2.5 py-0.5 text-xs font-medium text-navy-700">
                {TYPE_LABELS[workOrder.type]}
              </span>
              <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-graphite-700">
                Prioridade: {PRIORITY_LABELS[workOrder.priority]}
              </span>
            </div>
            <p className="text-sm text-graphite-700">{workOrder.description}</p>
            <dl className="grid gap-4 sm:grid-cols-2">
              {!isClient && <Info label="Tecnico" value={workOrder.technician?.name ?? "-"} />}
              <Info label="Codigo de falha" value={workOrder.failureCode ? `${workOrder.failureCode.code} - ${workOrder.failureCode.description}` : "-"} />
              <Info label="Iniciada em" value={formatDateTime(workOrder.startedAt)} />
              <Info label="Concluida em" value={formatDateTime(workOrder.completedAt)} />
              <Info label="Horas trabalhadas" value={workOrder.laborHours ? `${workOrder.laborHours}h` : "-"} />
              <Info label="Plano de origem" value={workOrder.plan?.name ?? "Avulsa"} />
            </dl>
            {workOrder.observations && (
              <div>
                <p className="text-xs uppercase tracking-wide text-graphite-400">Observacoes</p>
                <p className="mt-1 text-sm text-graphite-700">{workOrder.observations}</p>
              </div>
            )}
          </div>

          <div className="card space-y-3 p-5">
            <h2 className="font-semibold text-navy-900">Checklist de execucao</h2>
            {!workOrder.checklist || workOrder.checklist.length === 0 ? (
              <p className="text-sm text-graphite-500">Nenhum item de checklist.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {workOrder.checklist.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-sm text-graphite-800">{item.description}</span>
                    <div className="flex shrink-0 gap-1.5">
                      {RESULT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={!canManage || isCompleted}
                          onClick={() => handleChecklistResult(item.id, opt.value)}
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-opacity disabled:opacity-40 ${
                            item.result === opt.value ? opt.tone : "border-gray-200 bg-white text-graphite-400"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card space-y-3 p-5">
            <h2 className="font-semibold text-navy-900">Pecas consumidas (almoxarifado)</h2>
            {canManage && !isCompleted && (
              <div className="flex flex-wrap items-end gap-2">
                <select className="input flex-1" value={partSparePartId} onChange={(e) => setPartSparePartId(e.target.value)}>
                  <option value="">Selecione a peca</option>
                  {bomOptions.length > 0 && (
                    <optgroup label="Pecas deste ativo (BOM)">
                      {bomOptions.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} - estoque: {p.stockQty} {p.unit}</option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Todo o almoxarifado">
                    {otherOptions.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} - estoque: {p.stockQty} {p.unit}</option>
                    ))}
                  </optgroup>
                </select>
                <input
                  type="number"
                  min={1}
                  className="input w-24"
                  value={partQty}
                  onChange={(e) => setPartQty(Number(e.target.value))}
                />
                <button type="button" className="btn-outline" onClick={handleAddPart} disabled={busy || !partSparePartId}>
                  <Plus className="h-4 w-4" /> Adicionar
                </button>
              </div>
            )}
            {!workOrder.partsUsed || workOrder.partsUsed.length === 0 ? (
              <p className="text-sm text-graphite-500">Nenhuma peca registrada.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {workOrder.partsUsed.map((part) => (
                  <li key={part.id} className="flex items-center justify-between py-2 text-sm">
                    <span>{part.sparePart?.name ?? "Peca"} - {part.quantity} {part.sparePart?.unit ?? "un."}</span>
                    {canManage && !isCompleted && (
                      <button onClick={() => handleRemovePart(part.id)} className="text-graphite-400 hover:text-safety-red" aria-label="Remover peca">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <WorkOrderAttachments workOrderId={id} canEdit={!!canManage} />
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Remover ordem de manutencao"
        description="Tem certeza que deseja remover esta OS?"
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
