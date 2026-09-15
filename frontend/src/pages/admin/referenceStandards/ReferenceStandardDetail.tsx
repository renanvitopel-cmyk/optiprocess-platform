import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Plus, FileText, Camera } from "lucide-react";
import {
  getReferenceStandard,
  deleteReferenceStandard,
  deleteReferenceStandardCertificate,
  getReferenceStandardCertificateUrl,
} from "../../../api/referenceStandards";
import { PageHeader } from "../../../components/PageHeader";
import { FullPageSpinner } from "../../../components/Spinner";
import { StatusBadge } from "../../../components/StatusBadge";
import { EmptyState } from "../../../components/EmptyState";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { ReferenceStandardFormModal } from "./ReferenceStandardFormModal";
import { ReferenceStandardCertificateModal } from "./ReferenceStandardCertificateModal";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";
import { formatDate } from "../../../lib/format";

export default function ReferenceStandardDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [certOpen, setCertOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: standard, isLoading, refetch } = useQuery({
    queryKey: ["reference-standard", id],
    queryFn: () => getReferenceStandard(id),
  });

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteReferenceStandard(id);
      notify("success", "Padrao removido.");
      navigate("/gestao/padroes-referencia");
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteCertificate(certificateId: string) {
    try {
      await deleteReferenceStandardCertificate(id, certificateId);
      notify("success", "Certificado removido.");
      refetch();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function handleOpenCertificate(certificateId: string) {
    try {
      const url = await getReferenceStandardCertificateUrl(id, certificateId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  if (isLoading || !standard) return <FullPageSpinner />;

  return (
    <div>
      <PageHeader
        title={standard.description}
        description={[standard.manufacturer, standard.model, standard.serialNumber].filter(Boolean).join(" · ") || undefined}
        breadcrumbs={[{ label: "Padroes de referencia", to: "/gestao/padroes-referencia" }, { label: standard.description }]}
        actions={
          <>
            <button className="btn-outline" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" /> Editar
            </button>
            <button className="btn-danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" /> Remover
            </button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {standard.photoUrl ? (
          <img src={standard.photoUrl} alt="" className="h-16 w-16 rounded-lg border border-gray-200 object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
            <Camera className="h-5 w-5 text-graphite-300" />
          </div>
        )}
        <StatusBadge status={standard.certificationStatus} />
      </div>

      <div className="card mb-6 p-5">
        <dl className="grid gap-4 sm:grid-cols-3">
          <Info label="Tipo" value={standard.type ?? "-"} />
          <Info label="Faixa de medicao" value={standard.measurementRange ?? "-"} />
          <Info label="Resolucao" value={standard.resolution ?? "-"} />
          <Info label="Unidade" value={standard.unit ?? "-"} />
        </dl>
      </div>

      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-navy-900">Certificados</h2>
          <button className="btn-ghost btn-sm" onClick={() => setCertOpen(true)}>
            <Plus className="h-4 w-4" /> Novo certificado
          </button>
        </div>

        {!standard.certificates || standard.certificates.length === 0 ? (
          <EmptyState title="Nenhum certificado" description="Cadastre a primeira calibracao deste padrao." />
        ) : (
          <ul className="divide-y divide-gray-100">
            {standard.certificates.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-graphite-800">
                    {c.certificateNumber ?? "Sem numero"}{c.laboratory ? ` · ${c.laboratory}` : ""}
                  </p>
                  <p className="text-xs text-graphite-400">
                    Calibrado em {formatDate(c.calibrationDate)} · Valido ate {formatDate(c.validUntil)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {c.fileKey && (
                    <button
                      type="button"
                      className="text-graphite-400 hover:text-navy-700"
                      aria-label="Abrir arquivo do certificado"
                      onClick={() => handleOpenCertificate(c.id)}
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    className="text-graphite-400 hover:text-safety-red"
                    aria-label="Remover certificado"
                    onClick={() => handleDeleteCertificate(c.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ReferenceStandardFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        standard={standard}
        onSaved={() => {
          setEditOpen(false);
          queryClient.invalidateQueries({ queryKey: ["reference-standard", id] });
          queryClient.invalidateQueries({ queryKey: ["reference-standards"] });
        }}
      />

      <ReferenceStandardCertificateModal
        open={certOpen}
        onClose={() => setCertOpen(false)}
        referenceStandardId={id}
        onSaved={() => {
          setCertOpen(false);
          queryClient.invalidateQueries({ queryKey: ["reference-standard", id] });
          queryClient.invalidateQueries({ queryKey: ["reference-standards"] });
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Remover padrao de referencia"
        description="Tem certeza que deseja remover este padrao? Calibracoes que ja o usaram mantem os dados registrados."
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
