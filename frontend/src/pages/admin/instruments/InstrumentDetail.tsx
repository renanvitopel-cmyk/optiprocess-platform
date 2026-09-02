import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Plus } from "lucide-react";
import { deleteInstrument, getInstrument } from "../../../api/instruments";
import { listServiceOrders } from "../../../api/serviceOrders";
import { PageHeader } from "../../../components/PageHeader";
import { FullPageSpinner } from "../../../components/Spinner";
import { StatusBadge } from "../../../components/StatusBadge";
import { InstrumentFormModal } from "./InstrumentFormModal";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { useAuth } from "../../../auth/AuthContext";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";
import { clientDisplayName, formatDate, formatServiceCategory } from "../../../lib/format";
import { EmptyState } from "../../../components/EmptyState";

export default function InstrumentDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { notify } = useToast();
  const canManage = user?.role === "ADMIN" || user?.role === "TECHNICIAN";

  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: instrument, isLoading } = useQuery({ queryKey: ["instrument", id], queryFn: () => getInstrument(id) });
  const { data: serviceOrders } = useQuery({
    queryKey: ["instrument-service-orders", id],
    queryFn: () => listServiceOrders({ instrumentId: id, pageSize: 20 }),
    enabled: !!id,
  });

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteInstrument(id);
      notify("success", "Instrumento removido.");
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
        breadcrumbs={[{ label: "Instrumentos", to: "/gestao/instrumentos" }, { label: instrument.tag ?? instrument.model }]}
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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card space-y-4 p-5 lg:col-span-2">
          <StatusBadge status={instrument.derivedStatus ?? instrument.status} />
          <dl className="grid gap-4 sm:grid-cols-3">
            <Info label="Fabricante" value={instrument.manufacturer} />
            <Info label="Numero de serie" value={instrument.serialNumber} />
            <Info label="Faixa de medicao" value={instrument.measurementRange ?? "-"} />
            <Info label="Resolucao" value={instrument.resolution ?? "-"} />
            <Info label="Unidade" value={instrument.unit ?? "-"} />
            <Info label="Local de instalacao" value={instrument.installationLocation ?? "-"} />
            <Info label="Periodicidade" value={`${instrument.calibrationFrequencyMonths} meses`} />
            <Info label="Ultima calibracao" value={formatDate(instrument.lastCalibrationDate)} />
            <Info label="Proxima calibracao" value={formatDate(instrument.nextDueDate)} />
          </dl>
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
              <EmptyState title="Nenhuma calibracao" description="Este instrumento ainda nao possui certificados." />
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
        </div>
      </div>

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
        title="Remover instrumento"
        description="Tem certeza que deseja remover este instrumento? O historico de calibracoes sera preservado."
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
