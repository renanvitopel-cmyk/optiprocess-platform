import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { getInstrument } from "../../api/instruments";
import { listServiceOrders } from "../../api/serviceOrders";
import { listMeters } from "../../api/meters";
import { listMaintenancePlans } from "../../api/maintenancePlans";
import { listMaintenanceWorkOrders } from "../../api/maintenanceWorkOrders";
import { PageHeader } from "../../components/PageHeader";
import { FullPageSpinner } from "../../components/Spinner";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDate, formatServiceCategory } from "../../lib/format";
import { EmptyState } from "../../components/EmptyState";
import { PortalInstrumentFormModal } from "./PortalInstrumentFormModal";
import { useAuth } from "../../auth/AuthContext";

export default function PortalInstrumentDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const hasCmms = !!user?.client?.contractedServices?.includes("CMMS_MAINTENANCE");
  const [editOpen, setEditOpen] = useState(false);
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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card space-y-4 p-5 lg:col-span-2">
          <StatusBadge status={instrument.derivedStatus ?? instrument.status} />
          <dl className="grid gap-4 sm:grid-cols-3">
            <Info label="Fabricante" value={instrument.manufacturer} />
            <Info label="Numero de serie" value={instrument.serialNumber} />
            <Info label="Faixa de medicao" value={instrument.measurementRange ?? "-"} />
            <Info label="Local de instalacao" value={instrument.installationLocation ?? "-"} />
            <Info label="Periodicidade" value={`${instrument.calibrationFrequencyMonths} meses`} />
            <Info label="Ultima calibracao" value={formatDate(instrument.lastCalibrationDate)} />
            <Info label="Proxima calibracao" value={formatDate(instrument.nextDueDate)} />
          </dl>
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
                <h2 className="mb-3 font-semibold text-navy-900">Medidores</h2>
                {!meters || meters.length === 0 ? (
                  <EmptyState title="Nenhum medidor" />
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {meters.map((m) => (
                      <li key={m.id} className="py-2.5 text-sm">
                        <p className="font-medium text-graphite-800">{m.name}</p>
                        <p className="text-xs text-graphite-400">{m.currentValue} {m.unit}</p>
                      </li>
                    ))}
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
                              <Link to={`/portal/manutencao/${w.id}`} className="flex items-center justify-between py-2.5 text-sm hover:text-navy-700">
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
        </div>
      </div>

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
