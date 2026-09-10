import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { getInstrument, deleteInstrument, getImpactoDaRemocao } from "../../api/instruments";
import type { ImpactoDaRemocao } from "../../api/instruments";
import { listServiceOrders } from "../../api/serviceOrders";
import { PageHeader } from "../../components/PageHeader";
import { FullPageSpinner } from "../../components/Spinner";
import { StatusBadge } from "../../components/StatusBadge";
import { Tabs } from "../../components/Tabs";
import { formatDate, formatServiceCategory } from "../../lib/format";
import { EmptyState } from "../../components/EmptyState";
import { PortalInstrumentFormModal } from "./PortalInstrumentFormModal";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { InstrumentAttachments } from "../../components/InstrumentAttachments";
import { AssetPhoto } from "../../components/AssetPhoto";
import { useToast } from "../../components/Toast";
import { getApiErrorMessage } from "../../api/client";

/**
 * O texto da confirmacao diz o TAMANHO do que esta pendurado no ativo.
 *
 * "Tem certeza?" sozinho nao ajuda a decidir: o que muda a resposta e' saber que o ativo
 * tem calibracoes no historico, ou que nao tem nada.
 */
function descricaoDaRemocao(tag: string | null, impacto?: ImpactoDaRemocao): string {
  const nome = tag ? `O ativo ${tag}` : "O ativo";
  const base = `${nome} sai das listas. Nada e' apagado: o historico continua guardado.`;
  if (!impacto) return base;
  return impacto.calibracoes > 0 ? `${base} Estao ligadas a ele: ${impacto.calibracoes} calibracao(oes).` : base;
}

export default function PortalInstrumentDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [tab, setTab] = useState("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [confirmarRemocao, setConfirmarRemocao] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const { data: instrument, isLoading } = useQuery({ queryKey: ["portal-instrument", id], queryFn: () => getInstrument(id) });
  // O que esta pendurado no ativo. Buscado so ao abrir a confirmacao: a ficha nao
  // precisa desses numeros para nada alem de avisar antes de remover.
  const { data: impacto } = useQuery({
    queryKey: ["impacto-remocao", id],
    queryFn: () => getImpactoDaRemocao(id),
    enabled: confirmarRemocao && !!id,
  });
  const { data: serviceOrders } = useQuery({
    queryKey: ["portal-instrument-service-orders", id],
    queryFn: () => listServiceOrders({ instrumentId: id, pageSize: 20 }),
    enabled: !!id,
  });

  async function removerAtivo() {
    setRemovendo(true);
    try {
      await deleteInstrument(id);
      notify("success", "Ativo removido.");
      queryClient.invalidateQueries({ queryKey: ["portal-instruments"] });
      navigate("/portal/instrumentos");
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setRemovendo(false);
      setConfirmarRemocao(false);
    }
  }

  if (isLoading || !instrument) return <FullPageSpinner />;

  const tabs = [
    { id: "overview", label: "Visao geral" },
    { id: "certificates", label: "Certificados" },
    { id: "services", label: "Servicos externos" },
    { id: "documents", label: "Documentos" },
  ];

  return (
    <div>
      <PageHeader
        title={`TAG ${instrument.tag ?? "sem TAG"}`}
        description={instrument.description || instrument.type}
        breadcrumbs={[{ label: "Meus ativos", to: "/portal/instrumentos" }, { label: instrument.tag ?? instrument.type }]}
        actions={
          <>
            <button className="btn-outline" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" /> Editar
            </button>
            <button className="btn-danger" onClick={() => setConfirmarRemocao(true)}>
              <Trash2 className="h-4 w-4" /> Remover
            </button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <AssetPhoto
          instrumentId={instrument.id}
          tag={instrument.tag}
          photoUrl={instrument.photoUrl}
          podeEditar
          aoMudar={() => queryClient.invalidateQueries({ queryKey: ["portal-instrument", id] })}
        />
        <StatusBadge status={instrument.derivedStatus ?? instrument.status} />
      </div>

      <ConfirmDialog
        open={confirmarRemocao}
        title="Remover este ativo"
        description={descricaoDaRemocao(instrument.tag, impacto)}
        confirmLabel="Remover"
        danger
        loading={removendo}
        onConfirm={() => void removerAtivo()}
        onCancel={() => setConfirmarRemocao(false)}
      />

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === "overview" && (
        <div className="card p-5">
          <dl className="grid gap-4 sm:grid-cols-3">
            <Info label="Fabricante" value={instrument.manufacturer ?? "-"} />
            <Info label="Numero de serie" value={instrument.serialNumber ?? "-"} />
            <Info label="Faixa de medicao" value={instrument.measurementRange ?? "-"} />
            <Info label="Local de instalacao" value={instrument.installationLocation ?? "-"} />
            <Info label="Periodicidade" value={instrument.calibrationFrequencyMonths ? `${instrument.calibrationFrequencyMonths} meses` : "Nao rastreada"} />
            <Info label="Ultima calibracao" value={formatDate(instrument.lastCalibrationDate)} />
            <Info label="Proxima calibracao" value={formatDate(instrument.nextDueDate)} />
          </dl>
        </div>
      )}

      {tab === "certificates" && (
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
      )}

      {tab === "services" && (
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
      )}

      {tab === "documents" && <InstrumentAttachments instrumentId={instrument.id} canEdit />}

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
