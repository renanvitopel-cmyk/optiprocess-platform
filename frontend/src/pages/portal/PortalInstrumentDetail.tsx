import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, CornerLeftUp, AlertTriangle } from "lucide-react";
import { getInstrument, listAssetParts, addAssetPart, removeAssetPart, getInstrumentPartsHistory } from "../../api/instruments";
import { listSpareParts } from "../../api/spareParts";
import { listServiceOrders } from "../../api/serviceOrders";
import { listMeters, addMeterReading } from "../../api/meters";
import { listMaintenancePlans } from "../../api/maintenancePlans";
import { listMaintenanceWorkOrders } from "../../api/maintenanceWorkOrders";
import { PageHeader } from "../../components/PageHeader";
import { FullPageSpinner } from "../../components/Spinner";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDate, formatServiceCategory } from "../../lib/format";
import { EmptyState } from "../../components/EmptyState";
import { PortalInstrumentFormModal } from "./PortalInstrumentFormModal";
import { MeterFormModal } from "../admin/instruments/MeterFormModal";
import { InstrumentAttachments } from "../../components/InstrumentAttachments";
import { useAuth } from "../../auth/AuthContext";
import { useToast } from "../../components/Toast";
import { getApiErrorMessage } from "../../api/client";

const PRIORITY_LABELS: Record<string, string> = { LOW: "Baixa", MEDIUM: "Media", HIGH: "Alta", CRITICAL: "Critica" };

export default function PortalInstrumentDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const hasCmms = !!user?.client?.contractedServices?.includes("CMMS_MAINTENANCE");
  const { notify } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [addChildOpen, setAddChildOpen] = useState(false);
  const [meterModalOpen, setMeterModalOpen] = useState(false);
  const [selectedSparePartId, setSelectedSparePartId] = useState("");
  const { data: instrument, isLoading } = useQuery({ queryKey: ["portal-instrument", id], queryFn: () => getInstrument(id) });
  const { data: serviceOrders } = useQuery({
    queryKey: ["portal-instrument-service-orders", id],
    queryFn: () => listServiceOrders({ instrumentId: id, pageSize: 20 }),
    enabled: !!id,
  });
  const { data: meters } = useQuery({
    queryKey: ["portal-instrument-meters", id],
    queryFn: () => listMeters({ instrumentId: id }),
    enabled: !!id && hasCmms,
  });
  const { data: plans } = useQuery({
    queryKey: ["portal-instrument-maintenance-plans", id],
    queryFn: () => listMaintenancePlans({ instrumentId: id, pageSize: 10 }),
    enabled: !!id && hasCmms,
  });
  const { data: workOrders } = useQuery({
    queryKey: ["portal-instrument-maintenance-work-orders", id],
    queryFn: () => listMaintenanceWorkOrders({ instrumentId: id, pageSize: 10 }),
    enabled: !!id && hasCmms,
  });

  const { data: assetParts } = useQuery({
    queryKey: ["portal-instrument-asset-parts", id],
    queryFn: () => listAssetParts(id),
    enabled: !!id && hasCmms,
  });
  const { data: spareParts } = useQuery({
    queryKey: ["portal-spare-parts-picker"],
    queryFn: () => listSpareParts({ active: true, pageSize: 200 }),
    enabled: hasCmms,
  });
  const { data: partsHistory } = useQuery({
    queryKey: ["portal-instrument-parts-history", id],
    queryFn: () => getInstrumentPartsHistory(id),
    enabled: !!id && hasCmms,
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
      queryClient.invalidateQueries({ queryKey: ["portal-instrument-meters", id] });
      queryClient.invalidateQueries({ queryKey: ["portal-instrument-maintenance-work-orders", id] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function handleAddAssetPart() {
    if (!selectedSparePartId) return;
    try {
      await addAssetPart(id, selectedSparePartId);
      setSelectedSparePartId("");
      queryClient.invalidateQueries({ queryKey: ["portal-instrument-asset-parts", id] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function handleRemoveAssetPart(linkId: string) {
    try {
      await removeAssetPart(id, linkId);
      queryClient.invalidateQueries({ queryKey: ["portal-instrument-asset-parts", id] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  if (isLoading || !instrument) return <FullPageSpinner />;

  return (
    <div>
      <PageHeader
        title={`TAG ${instrument.tag ?? "sem TAG"}`}
        description={`${instrument.type} - ${instrument.model}`}
        breadcrumbs={[{ label: "Meus ativos", to: "/portal/instrumentos" }, { label: instrument.tag ?? instrument.model }]}
        actions={
          <button className="btn-outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> Editar
          </button>
        }
      />

      {instrument.parent && (
        <Link
          to={`/portal/instrumentos/${instrument.parent.id}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-navy-700 hover:underline"
        >
          <CornerLeftUp className="h-4 w-4" /> Componente de: TAG {instrument.parent.tag ?? instrument.parent.type}
        </Link>
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
              <Info label="Local de instalacao" value={instrument.installationLocation ?? "-"} />
              <Info label="Periodicidade" value={instrument.calibrationFrequencyMonths ? `${instrument.calibrationFrequencyMonths} meses` : "Nao rastreada"} />
              <Info label="Ultima calibracao" value={formatDate(instrument.lastCalibrationDate)} />
              <Info label="Proxima calibracao" value={formatDate(instrument.nextDueDate)} />
            </dl>
          </div>

          <InstrumentAttachments instrumentId={instrument.id} canEdit />
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-navy-900">Certificados</h2>
            {!instrument.calibrations || instrument.calibrations.length === 0 ? (
              <EmptyState title="Nenhum certificado disponivel" />
            ) : (
              <ul className="divide-y divide-gray-100">
                {instrument.calibrations
                  .filter((c) => c.visibleToClient)
                  .map((c) => (
                    <li key={c.id}>
                      <Link to={`/portal/certificados/${c.id}`} className="flex items-center justify-between py-2.5 text-sm hover:text-navy-700">
                        <span className="font-medium text-graphite-800">{c.certificateNumber}</span>
                        <StatusBadge status={c.status} />
                      </Link>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-navy-900">Servicos neste ativo</h2>
            {!serviceOrders || serviceOrders.items.length === 0 ? (
              <EmptyState title="Nenhum servico" description="Nenhuma ordem de servico vinculada a este ativo ainda." />
            ) : (
              <ul className="divide-y divide-gray-100">
                {serviceOrders.items.map((o) => (
                  <li key={o.id}>
                    <Link to={`/portal/ordens-servico/${o.id}`} className="flex items-center justify-between py-2.5 text-sm hover:text-navy-700">
                      <div>
                        <p className="font-medium text-graphite-800">{o.number}</p>
                        <p className="text-xs text-graphite-400">{formatServiceCategory(o.category)}</p>
                      </div>
                      <StatusBadge status={o.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {hasCmms && (
            <>
              <div className="card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-semibold text-navy-900">Medidores</h2>
                  <button className="btn-ghost btn-sm" onClick={() => setMeterModalOpen(true)}>
                    <Plus className="h-4 w-4" /> Novo
                  </button>
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
                          <button className="btn-ghost btn-sm" onClick={() => handleAddReading(m.id)}>Registrar leitura</button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="card p-5">
                <h2 className="mb-3 font-semibold text-navy-900">RLP Maintenance CMMS</h2>
                {(!plans || plans.items.length === 0) && (!workOrders || workOrders.items.length === 0) ? (
                  <EmptyState title="Nenhuma manutencao" description="Nenhum plano ou ordem de manutencao para este ativo ainda." />
                ) : (
                  <>
                    {plans && plans.items.length > 0 && (
                      <ul className="divide-y divide-gray-100">
                        {plans.items.map((p) => (
                          <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                            <span className="font-medium text-graphite-800">{p.name}</span>
                            <StatusBadge status={p.active ? (p.derivedStatus ?? "VALID") : "INACTIVE"} />
                          </li>
                        ))}
                      </ul>
                    )}
                    {workOrders && workOrders.items.length > 0 && (
                      <>
                        <p className="mt-3 text-xs uppercase tracking-wide text-graphite-400">Ordens de manutencao</p>
                        <ul className="divide-y divide-gray-100">
                          {workOrders.items.map((w) => (
                            <li key={w.id}>
                              <Link to={`/portal/manutencao/ordens/${w.id}`} className="flex items-center justify-between py-2.5 text-sm hover:text-navy-700">
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
            </>
          )}

          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-navy-900">Ativos filhos</h2>
              <button className="btn-ghost btn-sm" onClick={() => setAddChildOpen(true)}>
                <Plus className="h-4 w-4" /> Adicionar filho
              </button>
            </div>
            {!instrument.children || instrument.children.length === 0 ? (
              <EmptyState title="Nenhum componente" description="Ex.: motor, valvula, painel - componentes deste ativo com ficha propria." />
            ) : (
              <ul className="divide-y divide-gray-100">
                {instrument.children.map((c) => (
                  <li key={c.id}>
                    <Link to={`/portal/instrumentos/${c.id}`} className="flex items-center justify-between py-2.5 text-sm hover:text-navy-700">
                      <span className="font-medium text-graphite-800">TAG {c.tag ?? c.type}</span>
                      <span className="text-xs text-graphite-400">{c.type}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {hasCmms && (
            <div className="card p-5">
              <h2 className="mb-3 font-semibold text-navy-900">Pecas compativeis (BOM)</h2>
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
              {!assetParts || assetParts.length === 0 ? (
                <EmptyState title="Nenhuma peca vinculada" description="Vincule as pecas do seu almoxarifado usadas neste ativo." />
              ) : (
                <ul className="divide-y divide-gray-100">
                  {assetParts.map((link) => (
                    <li key={link.id} className="flex items-center justify-between py-2.5 text-sm">
                      <span className="text-graphite-800">{link.sparePart?.name}</span>
                      <button onClick={() => handleRemoveAssetPart(link.id)} className="text-graphite-400 hover:text-safety-red" aria-label="Remover vinculo">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {hasCmms && (
            <div className="card p-5">
              <h2 className="mb-1 font-semibold text-navy-900">Historico de pecas consumidas</h2>
              <p className="mb-3 text-xs text-graphite-500">O que ja foi baixado do seu almoxarifado nas OS deste ativo.</p>
              {!partsHistory || partsHistory.length === 0 ? (
                <EmptyState title="Nenhum consumo registrado" description="Aparece aqui assim que uma OS deste ativo consumir uma peca do almoxarifado." />
              ) : (
                <ul className="divide-y divide-gray-100">
                  {partsHistory.map((entry) => (
                    <li key={entry.sparePart.id} className="py-2.5 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-graphite-800">{entry.sparePart.name}</span>
                        <span className="text-graphite-600">{entry.totalQuantity} {entry.sparePart.unit}</span>
                      </div>
                      <p className="text-xs text-graphite-400">
                        Usada {entry.timesUsed}x · ultima vez {formatDate(entry.lastUsedAt)}
                        {entry.lastWorkOrder && (
                          <>
                            {" "}·{" "}
                            <Link to={`/portal/manutencao/ordens/${entry.lastWorkOrder.id}`} className="hover:underline">{entry.lastWorkOrder.number}</Link>
                          </>
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      <MeterFormModal
        open={meterModalOpen}
        onClose={() => setMeterModalOpen(false)}
        instrumentId={instrument.id}
        onSaved={() => {
          setMeterModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ["portal-instrument-meters", id] });
        }}
      />

      <PortalInstrumentFormModal
        open={addChildOpen}
        onClose={() => setAddChildOpen(false)}
        initialParentId={instrument.id}
        onSaved={() => {
          setAddChildOpen(false);
          queryClient.invalidateQueries({ queryKey: ["portal-instrument", id] });
        }}
      />

      <PortalInstrumentFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        instrument={instrument}
        onSaved={() => {
          setEditOpen(false);
          queryClient.invalidateQueries({ queryKey: ["portal-instrument", id] });
          queryClient.invalidateQueries({ queryKey: ["portal-instruments"] });
        }}
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
