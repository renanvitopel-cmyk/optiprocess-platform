import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, PlayCircle, CheckCircle2, Plus, X, Square } from "lucide-react";
import {
  getMaintenanceWorkOrder,
  deleteMaintenanceWorkOrder,
  updateMaintenanceWorkOrder,
  startMaintenanceWorkOrder,
  completeMaintenanceWorkOrder,
  updateChecklistItem,
  addWorkOrderPart,
  removeWorkOrderPart,
  addWorkOrderLabor,
  removeWorkOrderLabor,
  addWorkOrderThirdPartyService,
  removeWorkOrderThirdPartyService,
  addWorkOrderReservation,
  releaseWorkOrderReservation,
  consumeWorkOrderReservation,
  addWorkOrderStoppage,
  updateWorkOrderStoppage,
  removeWorkOrderStoppage,
  addWorkOrderAssignee,
  removeWorkOrderAssignee,
} from "../../../api/maintenanceWorkOrders";
import { listSpareParts } from "../../../api/spareParts";
import { listAssetParts } from "../../../api/instruments";
import { listLaborResources } from "../../../api/laborResources";
import { listStoppageReasons } from "../../../api/stoppageReasons";
import type { ChecklistItemResult, MaintenanceOrderStatus, LaborHourType, MaintenanceWorkOrder } from "../../../api/types";
import { PageHeader } from "../../../components/PageHeader";
import { FullPageSpinner } from "../../../components/Spinner";
import { StatusBadge } from "../../../components/StatusBadge";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { Tabs } from "../../../components/Tabs";
import { WorkOrderAttachments } from "./WorkOrderAttachments";
import { useCmms } from "../../../lib/cmms";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";
import { clientDisplayName, formatDateTime, formatCurrency } from "../../../lib/format";

const RESULT_OPTIONS: { value: ChecklistItemResult; label: string; tone: string }[] = [
  { value: "OK", label: "OK", tone: "bg-green-50 text-safety-green-dark border-green-200" },
  { value: "NOT_OK", label: "Nao OK", tone: "bg-red-50 text-safety-red border-red-200" },
  { value: "NA", label: "N/A", tone: "bg-graphite-100 text-graphite-600 border-graphite-200" },
];

const TYPE_LABELS: Record<string, string> = { PREVENTIVE: "Preventiva", CORRECTIVE: "Corretiva", PREDICTIVE: "Preditiva" };
const PRIORITY_LABELS: Record<string, string> = { LOW: "Baixa", MEDIUM: "Media", HIGH: "Alta", CRITICAL: "Critica" };
const HOUR_TYPE_LABELS: Record<LaborHourType, string> = { NORMAL: "Normal", OVERTIME: "Extra", NIGHT: "Noturna" };

export default function WorkOrderDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const { canManage, isClient, base } = useCmms();

  const [tab, setTab] = useState("geral");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [partSparePartId, setPartSparePartId] = useState("");
  const [partQty, setPartQty] = useState(1);
  const [laborResourceId, setLaborResourceId] = useState("");
  const [laborHours, setLaborHours] = useState(1);
  const [laborHourType, setLaborHourType] = useState<LaborHourType | "">("");
  const [laborStart, setLaborStart] = useState("");
  const [laborEnd, setLaborEnd] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [serviceCost, setServiceCost] = useState(0);
  const [reservationSparePartId, setReservationSparePartId] = useState("");
  const [reservationQty, setReservationQty] = useState(1);
  const [stoppageReasonId, setStoppageReasonId] = useState("");
  const [stoppageStart, setStoppageStart] = useState("");
  const [stoppageNotes, setStoppageNotes] = useState("");

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
  const { data: laborResources } = useQuery({
    queryKey: ["labor-resources-picker", workOrder?.clientId],
    queryFn: () => listLaborResources({ clientId: workOrder!.clientId, active: true, pageSize: 200 }),
    enabled: !!workOrder?.clientId,
  });
  const { data: stoppageReasons } = useQuery({
    queryKey: ["stoppage-reasons-picker"],
    queryFn: () => listStoppageReasons({ active: true }),
  });

  // No apontamento de horas, quem esta na OS (responsavel + apoio) vem primeiro - mas a
  // lista completa continua disponivel, porque quem entrou para ajudar no dia tambem
  // precisa conseguir lancar as horas dele.
  const teamIds = new Set([
    ...(workOrder?.assignedResourceId ? [workOrder.assignedResourceId] : []),
    ...(workOrder?.assignees ?? []).map((a) => a.laborResourceId),
  ]);
  const teamOptions = (laborResources?.items ?? []).filter((r) => teamIds.has(r.id));
  const otherLaborOptions = (laborResources?.items ?? []).filter((r) => !teamIds.has(r.id));

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

  async function handleStatusChange(status: MaintenanceOrderStatus) {
    setBusy(true);
    try {
      await updateMaintenanceWorkOrder(id, { status });
      notify("success", "Status atualizado.");
      invalidate();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleChecklistResult(itemId: string, result: ChecklistItemResult) {
    try {
      const { spawnedWorkOrder } = await updateChecklistItem(id, itemId, { result });
      if (spawnedWorkOrder) {
        notify("success", `Anomalia registrada - OS corretiva ${spawnedWorkOrder.number} aberta automaticamente.`);
      }
      invalidate();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  /** Grava medicao ou texto do item. O backend decide sozinho se a medicao ficou fora da
   * faixa e, nesse caso, abre a corretiva - mesma regra do "Nao OK". */
  async function handleChecklistValue(
    itemId: string,
    valores: { numericValue?: number | null; textValue?: string | null; result?: ChecklistItemResult },
  ) {
    try {
      const { spawnedWorkOrder } = await updateChecklistItem(id, itemId, valores);
      if (spawnedWorkOrder) {
        notify("success", `Medicao fora da faixa - OS corretiva ${spawnedWorkOrder.number} aberta automaticamente.`);
      }
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

  async function handleAddLabor() {
    if (!laborResourceId || laborHours <= 0) return;
    setBusy(true);
    try {
      await addWorkOrderLabor(id, {
        laborResourceId,
        hours: laborHours,
        hourType: laborHourType || null,
        startedAt: laborStart ? new Date(laborStart).toISOString() : null,
        endedAt: laborEnd ? new Date(laborEnd).toISOString() : null,
      });
      notify("success", "Mao de obra registrada.");
      setLaborResourceId("");
      setLaborHours(1);
      setLaborHourType("");
      setLaborStart("");
      setLaborEnd("");
      invalidate();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveLabor(entryId: string) {
    setBusy(true);
    try {
      await removeWorkOrderLabor(id, entryId);
      notify("success", "Lancamento removido.");
      invalidate();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleAddThirdPartyService() {
    if (!supplierName.trim() || !serviceDescription.trim()) return;
    setBusy(true);
    try {
      await addWorkOrderThirdPartyService(id, { supplierName, description: serviceDescription, cost: serviceCost });
      notify("success", "Servico de terceiro registrado.");
      setSupplierName("");
      setServiceDescription("");
      setServiceCost(0);
      invalidate();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveThirdPartyService(serviceId: string) {
    setBusy(true);
    try {
      await removeWorkOrderThirdPartyService(id, serviceId);
      invalidate();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleAddReservation() {
    if (!reservationSparePartId || reservationQty < 1) return;
    setBusy(true);
    try {
      await addWorkOrderReservation(id, { sparePartId: reservationSparePartId, quantity: reservationQty });
      notify("success", "Peca reservada.");
      setReservationSparePartId("");
      setReservationQty(1);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["spare-parts-picker"] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleReleaseReservation(reservationId: string) {
    setBusy(true);
    try {
      await releaseWorkOrderReservation(id, reservationId);
      notify("success", "Reserva liberada.");
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["spare-parts-picker"] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleConsumeReservation(reservationId: string) {
    setBusy(true);
    try {
      await consumeWorkOrderReservation(id, reservationId);
      notify("success", "Reserva consumida - baixa registrada no estoque.");
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["spare-parts-picker"] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleAddStoppage() {
    if (!stoppageStart) return;
    setBusy(true);
    try {
      await addWorkOrderStoppage(id, {
        reasonId: stoppageReasonId || null,
        startedAt: new Date(stoppageStart).toISOString(),
        notes: stoppageNotes || null,
      });
      notify("success", "Parada registrada.");
      setStoppageReasonId("");
      setStoppageStart("");
      setStoppageNotes("");
      invalidate();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleEndStoppage(stoppageId: string) {
    setBusy(true);
    try {
      await updateWorkOrderStoppage(id, stoppageId, { endedAt: new Date().toISOString() });
      notify("success", "Parada encerrada.");
      invalidate();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveStoppage(stoppageId: string) {
    setBusy(true);
    try {
      await removeWorkOrderStoppage(id, stoppageId);
      invalidate();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (isLoading || !workOrder) return <FullPageSpinner />;

  const isCompleted = workOrder.status === "COMPLETED";
  const hasTraceability = !!workOrder.serviceRequest || !!workOrder.originWorkOrder || (workOrder.spawnedWorkOrders?.length ?? 0) > 0;

  // Custo desta OS - mesmo criterio do resumo por ativo (so soma o que tem custo
  // informado; "Nao rastreado" quando nada foi preenchido, nunca aparenta zero).
  const partsWithCost = (workOrder.partsUsed ?? []).filter((p) => p.unitCost != null);
  const partsCost = partsWithCost.reduce((sum, p) => sum + p.unitCost! * p.quantity, 0);
  const partsCostKnown = partsWithCost.length > 0;
  const laborWithCost = (workOrder.laborEntries ?? []).filter((l) => l.hourlyRateSnapshot != null);
  const laborCost = laborWithCost.reduce((sum, l) => sum + l.hourlyRateSnapshot! * l.hours, 0);
  const laborCostKnown = laborWithCost.length > 0;
  const thirdPartyCost = (workOrder.thirdPartyServices ?? []).reduce((sum, s) => sum + s.cost, 0);
  const thirdPartyCostKnown = (workOrder.thirdPartyServices ?? []).length > 0;
  const costSummaryKnown = partsCostKnown || laborCostKnown || thirdPartyCostKnown;

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

      <Tabs
        tabs={[
          { id: "geral", label: "Visao geral" },
          { id: "execucao", label: "Execucao" },
          { id: "equipe", label: "Equipe e horas" },
          { id: "materiais", label: "Materiais" },
          { id: "custos", label: "Custos" },
          { id: "anexos", label: "Anexos" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "geral" && (
        <div className="space-y-6">
        <div className="card space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            {canManage && !isCompleted && !workOrder.startedAt ? (
              // So cobre os estados sem botao dedicado - "Em execucao" (Iniciar) e
              // "Concluida" (Concluir) tem acao propria, com validacao de checklist e
              // efeitos colaterais (ex.: fecha a Solicitacao de Servico vinculada) que
              // esse select generico nao replica.
              <select
                className="input h-auto w-auto py-1 text-xs"
                value={workOrder.status}
                disabled={busy}
                onChange={(e) => handleStatusChange(e.target.value as MaintenanceOrderStatus)}
              >
                <option value="OPEN">Aberta</option>
                <option value="IN_TRIAGE">Em triagem</option>
                <option value="PLANNED">Planejada</option>
                <option value="PROGRAMMED">Programada</option>
                <option value="RELEASED">Liberada</option>
                <option value="AWAITING_MATERIAL">Aguardando material</option>
                <option value="AWAITING_RELEASE">Aguardando liberacao</option>
                <option value="AWAITING_STOPPAGE">Aguardando parada</option>
                <option value="CANCELED">Cancelada</option>
              </select>
            ) : (
              <StatusBadge status={workOrder.status} />
            )}
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
            <Info
              label="Quem vai executar"
              value={workOrder.assignedResource ? `${workOrder.assignedResource.name} (${workOrder.assignedResource.type})` : "A definir"}
            />
            <Info label="Programada para" value={workOrder.scheduledDate ? formatDateTime(workOrder.scheduledDate).slice(0, 10) : "-"} />
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

        {hasTraceability && (
          <div className="card space-y-3 p-5">
            <h2 className="font-semibold text-navy-900">Rastreabilidade</h2>
            {workOrder.serviceRequest && (
              <Link to={`${base}/solicitacoes/${workOrder.serviceRequest.id}`} className="flex items-center justify-between text-sm text-navy-700 hover:underline">
                <span>Originada da solicitacao de servico <span className="font-medium">{workOrder.serviceRequest.number}</span></span>
                <StatusBadge status={workOrder.serviceRequest.status} />
              </Link>
            )}
            {workOrder.originWorkOrder && (
              <Link to={`${base}/ordens/${workOrder.originWorkOrder.id}`} className="block text-sm text-navy-700 hover:underline">
                Anomalia identificada na inspecao da OS <span className="font-medium">{workOrder.originWorkOrder.number}</span>
                {workOrder.originChecklistItem && <span className="text-graphite-500"> - item: "{workOrder.originChecklistItem.description}"</span>}
              </Link>
            )}
            {(workOrder.spawnedWorkOrders?.length ?? 0) > 0 && (
              <div>
                <p className="mb-1.5 text-xs uppercase tracking-wide text-graphite-400">Corretivas abertas por anomalia nesta OS</p>
                <ul className="divide-y divide-gray-100">
                  {workOrder.spawnedWorkOrders!.map((w) => (
                    <li key={w.id}>
                      <Link to={`${base}/ordens/${w.id}`} className="flex items-center justify-between py-1.5 text-sm text-navy-700 hover:underline">
                        <span className="font-medium">{w.number}</span>
                        <StatusBadge status={w.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        </div>
      )}

      {tab === "execucao" && (
        <div className="space-y-6">
        <div className="card space-y-3 p-5">
          <h2 className="font-semibold text-navy-900">Checklist de execucao</h2>
          {!workOrder.checklist || workOrder.checklist.length === 0 ? (
            <p className="text-sm text-graphite-500">Nenhum item de checklist.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {workOrder.checklist.map((item, index) => {
                const secaoAnterior = index > 0 ? workOrder.checklist![index - 1].section : null;
                const abreSecao = item.section && item.section !== secaoAnterior;
                return (
                  <li key={item.id} className="py-2.5">
                    {abreSecao && (
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-graphite-400">{item.section}</p>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-sm text-graphite-800">
                          {item.description}
                          {item.required && <span className="ml-1 text-safety-red">*</span>}
                        </span>
                        {item.reference && (
                          <p className="text-xs text-graphite-400">Ref.: {item.reference}</p>
                        )}
                        {item.responseType === "NUMBER" && (item.minValue != null || item.maxValue != null) && (
                          <p className="text-xs text-graphite-400">
                            Faixa aceitavel: {item.minValue ?? "-"} a {item.maxValue ?? "-"}
                            {item.unit ? ` ${item.unit}` : ""}
                            {item.targetValue != null ? ` (alvo ${item.targetValue})` : ""}
                          </p>
                        )}
                        {item.requiresPhoto && (
                          <p className="text-xs text-safety-yellow-dark">Exige foto - anexe na aba Anexos.</p>
                        )}
                      </div>

                      {/* Medicao numerica: o valor e' a resposta. Fora da faixa vira anomalia
                          sozinho, sem depender de alguem lembrar de marcar "Nao OK". */}
                      {item.responseType === "NUMBER" ? (
                        <div className="flex shrink-0 items-center gap-2">
                          <input
                            type="number"
                            step="any"
                            defaultValue={item.numericValue ?? ""}
                            disabled={!canManage || isCompleted}
                            placeholder={item.unit ?? "valor"}
                            className="input h-9 w-32 py-1 text-sm"
                            onBlur={(e) => {
                              const valor = e.target.value === "" ? null : Number(e.target.value);
                              if (valor !== (item.numericValue ?? null)) handleChecklistValue(item.id, { numericValue: valor });
                            }}
                          />
                          {item.result !== "PENDING" && (
                            <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                              item.result === "NOT_OK"
                                ? "border-red-200 bg-red-50 text-safety-red"
                                : "border-green-200 bg-green-50 text-safety-green-dark"
                            }`}>
                              {item.result === "NOT_OK" ? "Fora da faixa" : "Na faixa"}
                            </span>
                          )}
                        </div>
                      ) : item.responseType === "TEXT" ? (
                        <input
                          type="text"
                          defaultValue={item.textValue ?? ""}
                          disabled={!canManage || isCompleted}
                          placeholder="Resposta"
                          className="input h-9 w-56 py-1 text-sm"
                          onBlur={(e) => {
                            if (e.target.value !== (item.textValue ?? "")) {
                              handleChecklistValue(item.id, { textValue: e.target.value || null, result: "OK" });
                            }
                          }}
                        />
                      ) : (
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
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="card space-y-3 p-5">
          <h2 className="font-semibold text-navy-900">Paradas</h2>
          {canManage && !isCompleted && (
            <div className="space-y-2">
              <select className="input" value={stoppageReasonId} onChange={(e) => setStoppageReasonId(e.target.value)}>
                <option value="">Motivo (opcional)</option>
                {(stoppageReasons ?? []).map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <input type="datetime-local" className="input" value={stoppageStart} onChange={(e) => setStoppageStart(e.target.value)} />
              <div className="flex items-center gap-2">
                <input className="input flex-1" placeholder="Observacao (opcional)" value={stoppageNotes} onChange={(e) => setStoppageNotes(e.target.value)} />
                <button type="button" className="btn-outline shrink-0" onClick={handleAddStoppage} disabled={busy || !stoppageStart}>
                  <Plus className="h-4 w-4" /> Registrar
                </button>
              </div>
            </div>
          )}
          {!workOrder.stoppages || workOrder.stoppages.length === 0 ? (
            <p className="text-sm text-graphite-500">Nenhuma parada registrada.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {workOrder.stoppages.map((s) => (
                <li key={s.id} className="py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-graphite-800">{s.reason?.name ?? "Sem motivo"}</span>
                    {canManage && (
                      <div className="flex items-center gap-2">
                        {!s.endedAt && (
                          <button onClick={() => handleEndStoppage(s.id)} className="inline-flex items-center gap-1 text-xs font-medium text-navy-700 hover:underline">
                            <Square className="h-3 w-3" /> Encerrar
                          </button>
                        )}
                        <button onClick={() => handleRemoveStoppage(s.id)} className="text-graphite-400 hover:text-safety-red" aria-label="Remover parada">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-graphite-400">
                    {formatDateTime(s.startedAt)} ate {s.endedAt ? formatDateTime(s.endedAt) : "em aberto"}
                  </p>
                  {s.notes && <p className="text-xs text-graphite-500">{s.notes}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
        </div>
      )}

      {tab === "equipe" && (
        <div className="space-y-6">
          <WorkOrderTeam workOrder={workOrder} canManage={!!canManage} onChanged={invalidate} />
        <div className="card space-y-3 p-5">
          <h2 className="font-semibold text-navy-900">Mao de obra</h2>
          {canManage && !isCompleted && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-end gap-2">
                <select className="input flex-1" value={laborResourceId} onChange={(e) => setLaborResourceId(e.target.value)}>
                  <option value="">Selecione quem trabalhou</option>
                  {teamOptions.length > 0 && (
                    <optgroup label="Equipe desta OS">
                      {teamOptions.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} - {r.type}{r.hourlyRate != null ? ` (${formatCurrency(r.hourlyRate)}/h)` : ""}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Demais da equipe de manutencao">
                    {otherLaborOptions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} - {r.type}{r.hourlyRate != null ? ` (${formatCurrency(r.hourlyRate)}/h)` : ""}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  className="input w-24"
                  value={laborHours}
                  onChange={(e) => setLaborHours(Number(e.target.value))}
                  aria-label="Horas"
                />
                <select className="input w-36" value={laborHourType} onChange={(e) => setLaborHourType(e.target.value as LaborHourType | "")}>
                  <option value="">Tipo de hora</option>
                  <option value="NORMAL">Normal</option>
                  <option value="OVERTIME">Extra</option>
                  <option value="NIGHT">Noturna</option>
                </select>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex-1 text-xs text-graphite-500">
                  Inicio (opcional)
                  <input type="datetime-local" className="input" value={laborStart} onChange={(e) => setLaborStart(e.target.value)} />
                </label>
                <label className="flex-1 text-xs text-graphite-500">
                  Fim (opcional)
                  <input type="datetime-local" className="input" value={laborEnd} onChange={(e) => setLaborEnd(e.target.value)} />
                </label>
                <button type="button" className="btn-outline" onClick={handleAddLabor} disabled={busy || !laborResourceId}>
                  <Plus className="h-4 w-4" /> Adicionar
                </button>
              </div>
            </div>
          )}
          {!workOrder.laborEntries || workOrder.laborEntries.length === 0 ? (
            <p className="text-sm text-graphite-500">Nenhum lancamento de mao de obra.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {workOrder.laborEntries.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <span>
                      {entry.laborResource?.name ?? "Mao de obra"} - {entry.hours}h{entry.hourType ? ` (${HOUR_TYPE_LABELS[entry.hourType]})` : ""}
                      {entry.hourlyRateSnapshot != null && ` - ${formatCurrency(entry.hourlyRateSnapshot * entry.hours)}`}
                    </span>
                    {(entry.startedAt || entry.endedAt) && (
                      <p className="text-xs text-graphite-400">
                        {entry.startedAt ? formatDateTime(entry.startedAt) : "-"} ate {entry.endedAt ? formatDateTime(entry.endedAt) : "-"}
                      </p>
                    )}
                  </div>
                  {canManage && !isCompleted && (
                    <button onClick={() => handleRemoveLabor(entry.id)} className="text-graphite-400 hover:text-safety-red" aria-label="Remover lancamento">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        </div>
      )}

      {tab === "materiais" && (
        <div className="space-y-6">
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
        <div className="card space-y-3 p-5">
          <h2 className="font-semibold text-navy-900">Materiais reservados</h2>
          {canManage && !isCompleted && (
            <div className="flex flex-wrap items-end gap-2">
              <select className="input flex-1" value={reservationSparePartId} onChange={(e) => setReservationSparePartId(e.target.value)}>
                <option value="">Selecione a peca</option>
                {(spareParts?.items ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{p.name} - disponivel: {p.stockQty - p.reservedQty} {p.unit}</option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                className="input w-20"
                value={reservationQty}
                onChange={(e) => setReservationQty(Number(e.target.value))}
              />
              <button type="button" className="btn-outline" onClick={handleAddReservation} disabled={busy || !reservationSparePartId}>
                <Plus className="h-4 w-4" /> Reservar
              </button>
            </div>
          )}
          {!workOrder.partReservations || workOrder.partReservations.length === 0 ? (
            <p className="text-sm text-graphite-500">Nenhuma peca reservada.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {workOrder.partReservations.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{r.sparePart?.name ?? "Peca"} - {r.quantity} {r.sparePart?.unit ?? "un."}</span>
                  {canManage && !isCompleted && (
                    <div className="flex gap-2">
                      <button onClick={() => handleConsumeReservation(r.id)} className="text-xs font-medium text-navy-700 hover:underline">Consumir</button>
                      <button onClick={() => handleReleaseReservation(r.id)} className="text-graphite-400 hover:text-safety-red" aria-label="Liberar reserva">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        </div>
      )}

      {tab === "custos" && (
        <div className="space-y-6">
        {costSummaryKnown && (
          <div className="card space-y-2 p-5">
            <h2 className="font-semibold text-navy-900">Custo desta OS</h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-graphite-500">Pecas</dt><dd className="font-medium text-graphite-800">{partsCostKnown ? formatCurrency(partsCost) : "Nao rastreado"}</dd></div>
              <div className="flex justify-between"><dt className="text-graphite-500">Mao de obra</dt><dd className="font-medium text-graphite-800">{laborCostKnown ? formatCurrency(laborCost) : "Nao rastreado"}</dd></div>
              <div className="flex justify-between"><dt className="text-graphite-500">Terceiros</dt><dd className="font-medium text-graphite-800">{thirdPartyCostKnown ? formatCurrency(thirdPartyCost) : "Nao rastreado"}</dd></div>
              <div className="flex justify-between border-t border-gray-100 pt-1.5"><dt className="font-semibold text-navy-900">Total</dt><dd className="font-semibold text-navy-900">{formatCurrency(partsCost + laborCost + thirdPartyCost)}</dd></div>
            </dl>
          </div>
        )}
        <div className="card space-y-3 p-5">
          <h2 className="font-semibold text-navy-900">Servicos de terceiros</h2>
          {canManage && !isCompleted && (
            <div className="space-y-2">
              <input className="input" placeholder="Fornecedor" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
              <input className="input" placeholder="Descricao do servico" value={serviceDescription} onChange={(e) => setServiceDescription(e.target.value)} />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="input flex-1"
                  placeholder="Custo"
                  value={serviceCost || ""}
                  onChange={(e) => setServiceCost(Number(e.target.value))}
                />
                <button type="button" className="btn-outline" onClick={handleAddThirdPartyService} disabled={busy || !supplierName || !serviceDescription}>
                  <Plus className="h-4 w-4" /> Adicionar
                </button>
              </div>
            </div>
          )}
          {!workOrder.thirdPartyServices || workOrder.thirdPartyServices.length === 0 ? (
            <p className="text-sm text-graphite-500">Nenhum servico de terceiro.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {workOrder.thirdPartyServices.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="text-graphite-800">{s.supplierName} - {formatCurrency(s.cost)}</p>
                    <p className="text-xs text-graphite-400">{s.description}</p>
                  </div>
                  {canManage && !isCompleted && (
                    <button onClick={() => handleRemoveThirdPartyService(s.id)} className="text-graphite-400 hover:text-safety-red" aria-label="Remover servico">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        </div>
      )}

      {tab === "anexos" && <WorkOrderAttachments workOrderId={id} canEdit={!!canManage} />}

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


/**
 * Responsavel + equipe de apoio da OS. O responsavel e' quem responde pelo servico (e o
 * mesmo que aparece no quadro de programacao); a equipe de apoio e' quem mais entra no
 * trabalho. Nenhum dos dois trava o apontamento de horas - quem apareceu para ajudar no
 * dia consegue lancar as horas dele do mesmo jeito.
 */
function WorkOrderTeam({
  workOrder,
  canManage,
  onChanged,
}: {
  workOrder: MaintenanceWorkOrder;
  canManage: boolean;
  onChanged: () => void;
}) {
  const { notify } = useToast();
  const [resourceId, setResourceId] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: laborResources } = useQuery({
    queryKey: ["labor-resources-picker", workOrder.clientId],
    queryFn: () => listLaborResources({ clientId: workOrder.clientId, active: true, pageSize: 200 }),
  });

  const jaNaEquipe = new Set([
    ...(workOrder.assignees ?? []).map((a) => a.laborResourceId),
    ...(workOrder.assignedResourceId ? [workOrder.assignedResourceId] : []),
  ]);
  const disponiveis = (laborResources?.items ?? []).filter((r) => !jaNaEquipe.has(r.id));
  const isCompleted = workOrder.status === "COMPLETED";

  async function handleAdd() {
    if (!resourceId) return;
    setBusy(true);
    try {
      await addWorkOrderAssignee(workOrder.id, resourceId);
      notify("success", "Adicionado a equipe da OS.");
      setResourceId("");
      onChanged();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(assigneeId: string) {
    setBusy(true);
    try {
      await removeWorkOrderAssignee(workOrder.id, assigneeId);
      onChanged();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-4 p-5">
      <h2 className="font-semibold text-navy-900">Equipe da OS</h2>

      <div>
        <p className="text-xs uppercase tracking-wide text-graphite-400">Responsavel</p>
        {workOrder.assignedResource ? (
          <p className="mt-1 text-sm font-medium text-graphite-800">
            {workOrder.assignedResource.name} <span className="font-normal text-graphite-500">- {workOrder.assignedResource.type}</span>
          </p>
        ) : (
          <p className="mt-1 text-sm text-graphite-500">
            Sem responsavel definido. Defina pelo quadro de Programacao, arrastando a OS para a pessoa e o dia.
          </p>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-xs uppercase tracking-wide text-graphite-400">Equipe de apoio</p>
        {(workOrder.assignees ?? []).length === 0 ? (
          <p className="text-sm text-graphite-500">Ninguem alem do responsavel.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {(workOrder.assignees ?? []).map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-graphite-800">
                  {a.laborResource?.name} <span className="text-graphite-500">- {a.laborResource?.type}</span>
                </span>
                {canManage && !isCompleted && (
                  <button onClick={() => handleRemove(a.id)} className="text-graphite-400 hover:text-safety-red" aria-label="Remover da equipe">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {canManage && !isCompleted && (
        <div className="flex flex-wrap items-end gap-2">
          <select className="input flex-1" value={resourceId} onChange={(e) => setResourceId(e.target.value)}>
            <option value="">Adicionar a equipe...</option>
            {disponiveis.map((r) => (
              <option key={r.id} value={r.id}>{r.name} - {r.type}</option>
            ))}
          </select>
          <button type="button" className="btn-outline" onClick={handleAdd} disabled={busy || !resourceId}>
            <Plus className="h-4 w-4" /> Adicionar
          </button>
        </div>
      )}
    </div>
  );
}
