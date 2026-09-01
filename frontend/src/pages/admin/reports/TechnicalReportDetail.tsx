import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, CheckCircle2, Eye, EyeOff, FileText, ExternalLink } from "lucide-react";
import {
  deleteTechnicalReport,
  getTechnicalReport,
  issueTechnicalReport,
  setTechnicalReportVisibility,
  uploadTechnicalReportPdf,
  getTechnicalReportPdfUrl,
} from "../../../api/technicalReports";
import { PageHeader } from "../../../components/PageHeader";
import { FullPageSpinner } from "../../../components/Spinner";
import { StatusBadge } from "../../../components/StatusBadge";
import { FileUpload } from "../../../components/FileUpload";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { TechnicalReportFormModal } from "./TechnicalReportFormModal";
import { useAuth } from "../../../auth/AuthContext";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";
import { clientDisplayName, formatDate, formatFileSize, formatReportCategory } from "../../../lib/format";

export default function TechnicalReportDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { notify } = useToast();
  const canManage = user?.role === "ADMIN" || user?.role === "TECHNICIAN";

  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: report, isLoading } = useQuery({ queryKey: ["technical-report", id], queryFn: () => getTechnicalReport(id) });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["technical-report", id] });
    queryClient.invalidateQueries({ queryKey: ["technical-reports"] });
  }

  async function handleUploadPdf(file: File) {
    try {
      await uploadTechnicalReportPdf(id, file);
      notify("success", "PDF anexado.");
      invalidate();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function handleIssue() {
    setBusy(true);
    try {
      await issueTechnicalReport(id);
      notify("success", "Laudo emitido.");
      invalidate();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleVisibility() {
    if (!report) return;
    try {
      await setTechnicalReportVisibility(id, !report.visibleToClient);
      notify("success", report.visibleToClient ? "Ocultado do portal do cliente." : "Liberado para o portal do cliente.");
      invalidate();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function handleViewPdf() {
    try {
      const url = await getTechnicalReportPdfUrl(id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await deleteTechnicalReport(id);
      notify("success", "Laudo removido.");
      navigate("/gestao/laudos");
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (isLoading || !report) return <FullPageSpinner />;

  return (
    <div>
      <PageHeader
        title={report.number}
        description={formatReportCategory(report.category)}
        breadcrumbs={[{ label: "Laudos tecnicos", to: "/gestao/laudos" }, { label: report.number }]}
        actions={
          canManage && (
            <>
              {report.status === "DRAFT" && (
                <>
                  <button className="btn-outline" onClick={() => setEditOpen(true)}>
                    <Pencil className="h-4 w-4" /> Editar
                  </button>
                  <button className="btn-primary" onClick={handleIssue} disabled={busy}>
                    <CheckCircle2 className="h-4 w-4" /> Emitir laudo
                  </button>
                </>
              )}
              {report.status === "ISSUED" && (
                <button className="btn-outline" onClick={handleToggleVisibility}>
                  {report.visibleToClient ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {report.visibleToClient ? "Ocultar do cliente" : "Liberar para o cliente"}
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
        <div className="card space-y-4 p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={report.status} />
            {report.visibleToClient && <span className="text-xs font-medium text-safety-green">Visivel no portal do cliente</span>}
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info label="Cliente" value={clientDisplayName(report.client)} />
            <Info label="Local" value={report.location} />
            <Info label="Responsavel" value={report.responsible?.name ?? "-"} />
            <Info label="Data" value={formatDate(report.reportDate)} />
            <Info label="Validade" value={formatDate(report.validUntil)} />
          </dl>
          {report.observations && (
            <div>
              <p className="text-xs uppercase tracking-wide text-graphite-400">Observacoes</p>
              <p className="mt-1 text-sm text-graphite-700">{report.observations}</p>
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-navy-900">Documento (PDF)</h2>
          {report.pdfAttachment ? (
            <div className="flex items-center justify-between rounded-md border border-gray-200 p-3 text-sm">
              <div className="flex items-center gap-2 text-graphite-700">
                <FileText className="h-4 w-4 text-navy-600" />
                <div>
                  <p className="font-medium">{report.pdfAttachment.fileName}</p>
                  <p className="text-xs text-graphite-400">{formatFileSize(report.pdfAttachment.sizeBytes)}</p>
                </div>
              </div>
              <button type="button" onClick={handleViewPdf} className="text-navy-700 hover:text-navy-900" aria-label="Abrir PDF">
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <p className="mb-3 text-sm text-graphite-500">Nenhum arquivo anexado ainda.</p>
          )}
          {canManage && report.status === "DRAFT" && (
            <div className="mt-3">
              <FileUpload accept="application/pdf" label="Enviar PDF do laudo" hint="Necessario para emitir o laudo" onUpload={handleUploadPdf} />
            </div>
          )}
        </div>
      </div>

      <TechnicalReportFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        report={report}
        onSaved={() => {
          setEditOpen(false);
          invalidate();
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Remover laudo"
        description="Tem certeza que deseja remover este laudo tecnico?"
        confirmLabel="Remover"
        danger
        loading={busy}
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
