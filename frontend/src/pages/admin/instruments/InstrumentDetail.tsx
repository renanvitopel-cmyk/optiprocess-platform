import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Plus, AlertTriangle } from "lucide-react";
import { deleteInstrument, getInstrument, listAssetParts, addAssetPart, removeAssetPart, getInstrumentPartsHistory, getInstrumentCostSummary } from "../../../api/instruments";
import { listServiceOrders } from "../../../api/serviceOrders";
import { listMeters, addMeterReading } from "../../../api/meters";
import { listMaintenancePlans } from "../../../api/maintenancePlans";
import { listMaintenanceWorkOrders } from "../../../api/maintenanceWorkOrders";
import { listSpareParts } from "../../../api/spareParts";
import { PageHeader } from "../../../components/PageHeader";
import { FullPageSpinner } from "../../../components/Spinner";
import { StatusBadge } from "../../../components/StatusBadge";
import { InstrumentFormModal } from "./InstrumentFormModal";
import { MeterFormModal } from "./MeterFormModal";
import { InstrumentAttachments } from "../../../components/InstrumentAttachments";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { useAuth } from "../../../auth/AuthContext";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";
import { clientDisplayName, formatDate, formatServiceCategory, formatCurrency } from "../../../lib/format";
import { EmptyState } from "../../../components/EmptyState";

const PRIORITY_LABELS: Record<string, string> = { LOW: "Baixa", MEDIUM: "Media", HIGH: "Alta", CRITICAL: "Critica" };

export default function InstrumentDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { notify } = useToast();
  const canManage = user?.role === "ADMIN" || user?.role === "TECHNICIAN";

  const [editOpen, setEditOpen] = useState(false);
  const [addChildOpen, setAddChildOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [meterModalOpen, setMeterModalOpen] = useState(false);
  const [selectedSparePartId, setSelectedSparePartId] = useState("");

  const { data: instrument, isLoading } = useQuery({ queryKey: ["instrument", id], queryFn: () => getInstrument(id) });
  const { data: serviceOrders } = useQuery({
    queryKey: ["instrument-service-orders", id],
    queryFn: () => listServiceOrders({ instrumentId: id, pageSize: 20 }),
    enabled: !!id,
  });
  const { data: meters } = useQuery({
    queryKey: ["instrument-meters", id],
    queryFn: () => listMeters({ instrumentId: id }),
    enabled: !!id,
  });
  const { data: plans } = useQuery({
    queryKey: ["instrument-maintenance-plans", id],
    queryFn: () => listMaintenancePlans({ instrumentId: id, pageSize: 10 }),
    enabled: !!id,
  });
  const { data: workOrders } = useQuery({
    queryKey: ["instrument-maintenance-work-orders", id],
    queryFn: () => listMaintenanceWorkOrders({ instrumentId: id, pageSize: 10 }),
    enabled: !!id,
  });
  const { data: assetParts } = useQuery({
    queryKey: ["instrument-asset-parts", id],
    queryFn: () => listAssetParts(id),
    enabled: !!id,
  });
  const { data: partsHistory } = useQuery({
    queryKey: ["instrument-parts-history", id],
    queryFn: () => getInstrumentPartsHistory(id),
    enabled: !!id,
  });
  const { data: costSummary } = useQuery({
    queryKey: ["instrument-cost-summary", id],
    queryFn: () => getInstrumentCostSummary(id),
    enabled: !!id,
  });
  const { data: spareParts } = useQuery({
    queryKey: ["spare-parts-picker", instrument?.clientId],
    queryFn: () => listSpareParts({ clientId: instrument!.clientId, active: true, pageSize: 200 }),
    enabled: !!instrument?.clientId,
  });

  async function handleAddReading(meterId: string) {
    const value = window.prompt("Nova leitura do medidor:");
    if (!value || Number.isNaN(Number(value))) return;
    try {
      const reading = await addMeterReading(meterId, Number(value));
      if (reading.triggeredWorkOrder) {
        notify("error", `Leitura fora da faixa! OS ${reading.triggeredWorkOrder.number} (preditiva) aberta automaticamente.`);
      } else {
        notify("success", "Leitura registrada.");
      }
      queryClient.invalidateQueries({ queryKey: ["instrument-meters", id] });
      queryClient.invalidateQueries({ queryKey: ["instrument-maintenance-work-orders", id] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function handleAddAssetPart() {
    if (!selectedSparePartId) return;
    try {
      await addAssetPart(id, selectedSparePartId);
      notify("success", "Peca vinculada ao ativo.");
      setSelectedSparePartId("");
      queryClient.invalidateQueries({ queryKey: ["instrument-asset-parts", id] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function handleRemoveAssetPart(linkId: string) {
    try {
      await removeAssetPart(id, linkId);
      queryClient.invalidateQueries({ queryKey: ["instrument-asset-parts", id] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteInstrument(id);
      notify("success", "Ativo removido.");
      navigate("/gestao/instrumentos");
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  }

  if (isLoading || !instrument) return <FullPageSpinner />;

  return (
    <div>
      <PageHeader
        title={`TAG ${instrument.tag ?? "sem TAG"}`}
        description={`${instrument.type} - ${instrument.model} · Cliente: ${clientDisplayName(instrument.client)}`}
        breadcrumbs={[{ label: "Ativos", to: "/gestao/instrumentos" }, { label: instrument.tag ?? instrument.model }]}
        actions={
          canManage && (
            <>
              <button className="btn-outline" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" /> Editar
              </button>
              <button className="btn-danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4" /> Remover
              </button>
            </>
          )
        }
      />

      {instrument.parent && (
        <p className="-mt-3 mb-4 text-sm text-graphite-500">
          Componente de:{" "}
          <Link to={`/gestao/instrumentos/${instrument.parent.id}`} className="font-medium text-navy-700 hover:underline">
            TAG {instrument.parent.tag ?? instrument.parent.type}
          </Link>
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card space-y-4 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={instrument.derivedStatus ?? instrument.status} />
              <StatusBadge status={instrument.criticality} label={`Criticidade: ${PRIORITY_LABELS[instrument.criticality]}`} />
            </div>
            <dl className="grid gap-4 sm:grid-cols-3">
              <Info label="Fabricante" value={instrument.manufacturer} />
              <Info label="Numero de serie" value={instrument.serialNumber} />
              <Info label="Faixa de medicao" value={instrument.measurementRange ?? "-"} />
              <Info label="Resolucao" value={instrument.resolution ?? "-"} />
              <Info label="Unidade" value={instrument.unit ?? "-"} />
              <Info label="Local de instalacao" value={instrument.installationLocation ?? "-"} />
              <Info label="Planta" value={instrument.plant?.name ?? "-"} />
              <Info label="Area" value={instrument.area?.name ?? "-"} />
              <Info label="Sistema" value={instrument.system?.name ?? "-"} />
              <Info label="Centro de custo" value={instrument.costCenter?.name ?? "-"} />
              <Info label="Periodicidade" value={instrument.calibrationFrequencyMonths ? `${instrument.calibrationFrequencyMonths} meses` : "Nao rastreada"} />
              <Info label="Ultima calibracao" value={formatDate(instrument.lastCalibrationDate)} />
              <Info label="Proxima calibracao" value={formatDate(instrument.nextDueDate)} />
            </dl>
          </div>

          {costSummary && (costSummary.partsCost != null || costSummary.laborCost != null) && (
            <div className="card p-5">
              <h2 className="mb-3 font-semibold text-navy-900">Gastos deste ativo</h2>
              <dl className="grid gap-4 sm:grid-cols-3">
                <Info label="Pecas" value={costSummary.partsCost != null ? formatCurrency(costSummary.partsCost) : "Nao rastreado"} />
                <Info
                  label="Mao de obra"
                  value={costSummary.laborCost != null ? `${formatCurrency(costSummary.laborCost)} (${costSummary.totalLaborHours}h)` : `Nao rastreado (${costSummary.totalLaborHours}h)`}
                />
                <Info label="Total" value={costSummary.totalCost != null ? formatCurrency(costSummary.totalCost) : "-"} />
              </dl>
            </div>
          )}

          <InstrumentAttachments instrumentId={instrument.id} canEdit={!!canManage} />
        </div>

        <div className="space-y-6">
          <p className="text-xs text-graphite-500">
            Tudo abaixo esta agrupado sob o TAG <span className="font-semibold text-navy-700">{instrument.tag}</span>.
          </p>
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-navy-900">Historico de calibracoes</h2>
              {canManage && (
                <Link to={`/gestao/calibracoes/novo?instrumentId=${instrument.id}&clientId=${instrument.clientId}`} className="btn-ghost btn-sm">
                  <Plus className="h-4 w-4" /> Nova
                </Link>
              )}
            </div>
            {!instrument.calibrations || instrument.calibrations.length === 0 ? (
              <EmptyState title="Nenhuma calibracao" description="Este ativo ainda nao possui certificados." />
            ) : (
              <ul className="divide-y divide-gray-100">
                {instrument.calibrations.map((c) => (
                  <li key={c.id}>
                    <Link to={`/gestao/calibracoes/${c.id}`} className="flex items-center justify-between py-2.5 text-sm hover:text-navy-700">
                      <div>
                        <p className="font-medium text-graphite-800">{c.certificateNumber}</p>
                        <p className="text-xs text-graphite-400">{formatDate(c.calibrationDate)}</p>
                      </div>
                      <StatusBadge status={c.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-navy-900">Servicos neste ativo</h2>
              {canManage && (
                <Link to={`/gestao/ordens-servico/novo?instrumentId=${instrument.id}&clientId=${instrument.clientId}`} className="btn-ghost btn-sm">
                  <Plus className="h-4 w-4" /> Nova
                </Link>
              )}
            </div>
            {!serviceOrders || serviceOrders.items.length === 0 ? (
              <EmptyState title="Nenhum servico" description="Nenhuma ordem de servico vinculada a este ativo ainda." />
            ) : (
              <ul className="divide-y divide-gray-100">
                {serviceOrders.items.map((o) => (
                  <li key={o.id}>
                    <Link to={`/gestao/ordens-servico/${o.id}`} className="flex items-center justify-between py-2.5 text-sm hover:text-navy-700">
                      <div>
                        <p className="font-medium text-graphite-800">{o.number} - {formatServiceCategory(o.category)}</p>
                        <p className="text-xs text-graphite-400">{o.scheduledDate ? formatDate(o.scheduledDate) : "Sem data agendada"}</p>
                      </div>
                      <StatusBadge status={o.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-navy-900">Medidores</h2>
              {canManage && (
                <button className="btn-ghost btn-sm" onClick={() => setMeterModalOpen(true)}>
                  <Plus className="h-4 w-4" /> Novo
                </button>
              )}
            </div>
            {!meters || meters.length === 0 ? (
              <EmptyState title="Nenhum medidor" description="Cadastre um horimetro ou odometro para manutencao por uso ou condicao (preditiva)." />
            ) : (
              <ul className="divide-y divide-gray-100">
                {meters.map((m) => {
                  const outOfRange = (m.minThreshold != null && m.currentValue < m.minThreshold) || (m.maxThreshold != null && m.currentValue > m.maxThreshold);
                  return (
                    <li key={m.id} className="flex items-center justify-between py-2.5 text-sm">
                      <div>
                        <p className="flex items-center gap-1.5 font-medium text-graphite-800">
                          {m.name}
                          {outOfRange && <AlertTriangle className="h-3.5 w-3.5 text-safety-red" aria-label="Fora da faixa normal" />}
                        </p>
                        <p className={`text-xs ${outOfRange ? "font-medium text-safety-red" : "text-graphite-400"}`}>
                          {m.currentValue} {m.unit}
                          {(m.minThreshold != null || m.maxThreshold != null) && (
                            <> · faixa normal: {m.minThreshold ?? "-"} a {m.maxThreshold ?? "-"} {m.unit}</>
                          )}
                        </p>
                      </div>
                      {canManage && (
                        <button className="btn-ghost btn-sm" onClick={() => handleAddReading(m.id)}>Registrar leitura</button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-navy-900">RLP Maintenance CMMS</h2>
              {canManage && (
                <Link to={`/gestao/manutencao/planos/novo?instrumentId=${instrument.id}&clientId=${instrument.clientId}`} className="btn-ghost btn-sm">
                  <Plus className="h-4 w-4" /> Novo plano
                </Link>
              )}
            </div>
            {(!plans || plans.items.length === 0) && (!workOrders || workOrders.items.length === 0) ? (
              <EmptyState title="Nenhuma manutencao" description="Nenhum plano ou ordem de manutencao para este ativo ainda." />
            ) : (
              <>
                {plans && plans.items.length > 0 && (
                  <ul className="divide-y divide-gray-100">
                    {plans.items.map((p) => (
                      <li key={p.id}>
                        <Link to={`/gestao/manutencao/planos/${p.id}`} className="flex items-center justify-between py-2.5 text-sm hover:text-navy-700">
                          <span className="font-medium text-graphite-800">{p.name}</span>
                          <StatusBadge status={p.active ? (p.derivedStatus ?? "VALID") : "INACTIVE"} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {workOrders && workOrders.items.length > 0 && (
                  <>
                    <p className="mt-3 text-xs uppercase tracking-wide text-graphite-400">Ordens de manutencao recentes</p>
                    <ul className="divide-y divide-gray-100">
                      {workOrders.items.map((w) => (
                        <li key={w.id}>
                          <Link to={`/gestao/manutencao/ordens/${w.id}`} className="flex items-center justify-between py-2.5 text-sm hover:text-navy-700">
                            <span className="font-medium text-graphite-800">{w.number}</span>
                            <StatusBadge status={w.status} />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </div>

          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-navy-900">Ativos filhos</h2>
              {canManage && (
                <button className="btn-ghost btn-sm" onClick={() => setAddChildOpen(true)}>
                  <Plus className="h-4 w-4" /> Adicionar filho
                </button>
              )}
            </div>
            {!instrument.children || instrument.children.length === 0 ? (
              <EmptyState title="Nenhum componente" description="Ex.: motor, valvula, painel - componentes deste ativo com ficha propria." />
            ) : (
              <ul className="divide-y divide-gray-100">
                {instrument.children.map((c) => (
                  <li key={c.id}>
                    <Link to={`/gestao/instrumentos/${c.id}`} className="flex items-center justify-between py-2.5 text-sm hover:text-navy-700">
                      <span className="font-medium text-graphite-800">TAG {c.tag ?? c.type}</span>
                      <span className="text-xs text-graphite-400">{c.type}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-navy-900">Pecas compativeis (BOM)</h2>
            {canManage && (
              <div className="mb-3 flex gap-2">
                <select className="input flex-1" value={selectedSparePartId} onChange={(e) => setSelectedSparePartId(e.target.value)}>
                  <option value="">Selecione uma peca do almoxarifado</option>
                  {(spareParts?.items ?? []).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}{p.code ? ` (${p.code})` : ""}</option>
                  ))}
                </select>
                <button type="button" className="btn-outline" onClick={handleAddAssetPart} disabled={!selectedSparePartId}>
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            )}
            {!assetParts || assetParts.length === 0 ? (
              <EmptyState title="Nenhuma peca vinculada" description="Vincule as pecas do almoxarifado usadas neste ativo." />
            ) : (
              <ul className="divide-y divide-gray-100">
                {assetParts.map((link) => (
                  <li key={link.id} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="text-graphite-800">{link.sparePart?.name}</span>
                    {canManage && (
                      <button onClick={() => handleRemoveAssetPart(link.id)} className="text-graphite-400 hover:text-safety-red" aria-label="Remover vinculo">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-5">
            <h2 className="mb-1 font-semibold text-navy-900">Historico de pecas consumidas</h2>
            <p className="mb-3 text-xs text-graphite-500">O que ja foi baixado do almoxarifado nas OS deste ativo - diferente do BOM acima, que so lista o que e' compativel.</p>
            {!partsHistory || partsHistory.length === 0 ? (
              <EmptyState title="Nenhum consumo registrado" description="Aparece aqui assim que uma OS deste ativo consumir uma peca do almoxarifado." />
            ) : (
              <ul className="divide-y divide-gray-100">
                {partsHistory.map((entry) => (
                  <li key={entry.sparePart.id} className="py-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-graphite-800">{entry.sparePart.name}</span>
                      <span className="text-graphite-600">
                        {entry.totalQuantity} {entry.sparePart.unit}
                        {entry.totalCost != null && <span className="ml-1.5 text-graphite-400">({formatCurrency(entry.totalCost)})</span>}
                      </span>
                    </div>
                    <p className="text-xs text-graphite-400">
                      Usada {entry.timesUsed}x · ultima vez {formatDate(entry.lastUsedAt)}
                      {entry.lastWorkOrder && (
                        <>
                          {" "}·{" "}
                          <Link to={`/gestao/manutencao/ordens/${entry.lastWorkOrder.id}`} className="hover:underline">{entry.lastWorkOrder.number}</Link>
                        </>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <InstrumentFormModal
        open={addChildOpen}
        onClose={() => setAddChildOpen(false)}
        initialParentId={instrument.id}
        initialClientId={instrument.clientId}
        initialTagPrefix={instrument.tag ? `${instrument.tag}-` : undefined}
        onSaved={() => {
          setAddChildOpen(false);
          queryClient.invalidateQueries({ queryKey: ["instrument", id] });
        }}
      />

      <MeterFormModal
        open={meterModalOpen}
        onClose={() => setMeterModalOpen(false)}
        instrumentId={instrument.id}
        onSaved={() => {
          setMeterModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ["instrument-meters", id] });
        }}
      />

      <InstrumentFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        instrument={instrument}
        onSaved={() => {
          setEditOpen(false);
          queryClient.invalidateQueries({ queryKey: ["instrument", id] });
          queryClient.invalidateQueries({ queryKey: ["instruments"] });
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Remover ativo"
        description="Tem certeza que deseja remover este ativo? O historico de calibracoes sera preservado."
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
