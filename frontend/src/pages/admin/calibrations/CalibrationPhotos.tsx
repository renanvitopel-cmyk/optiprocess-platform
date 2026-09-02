import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Trash2, Loader2, ExternalLink, FileText, Paperclip } from "lucide-react";
import {
  deleteCalibrationAttachment,
  getCalibrationAttachmentUrl,
  listCalibrationAttachments,
  uploadCalibrationAttachment,
} from "../../../api/calibrations";
import type { AttachmentCategory, CalibrationAttachment } from "../../../api/types";
import { getApiErrorMessage } from "../../../api/client";
import { useToast } from "../../../components/Toast";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { formatFileSize } from "../../../lib/format";

/** Etapas do registro de campo, na ordem em que o tecnico costuma executar. */
const PHOTO_STEPS: { category: AttachmentCategory; label: string; hint: string }[] = [
  { category: "LOCATION", label: "Local", hint: "Onde o instrumento esta instalado" },
  { category: "INSTRUMENT", label: "Instrumento", hint: "O equipamento calibrado e sua identificacao" },
  { category: "STANDARD", label: "Padrao usado", hint: "O padrao de referencia utilizado" },
  { category: "MEASUREMENT", label: "Leituras", hint: "As medicoes durante a calibracao" },
];

export const CATEGORY_LABELS: Record<AttachmentCategory, string> = {
  LOCATION: "Local da calibracao",
  INSTRUMENT: "Instrumento calibrado",
  STANDARD: "Padrao utilizado",
  MEASUREMENT: "Leituras / medicoes",
  DOCUMENT: "Documento",
  OTHER: "Registro",
};

export function CalibrationPhotos({
  calibrationId,
  canEdit,
  certificateAttachmentId,
}: {
  calibrationId: string;
  canEdit: boolean;
  certificateAttachmentId?: string | null;
}) {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [uploading, setUploading] = useState<AttachmentCategory | null>(null);
  const [deleting, setDeleting] = useState<CalibrationAttachment | undefined>();
  const [busy, setBusy] = useState(false);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data: attachments } = useQuery({
    queryKey: ["calibration-attachments", calibrationId],
    queryFn: () => listCalibrationAttachments(calibrationId),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["calibration-attachments", calibrationId] });
    queryClient.invalidateQueries({ queryKey: ["calibration", calibrationId] });
  }

  async function handleFile(category: AttachmentCategory, file: File | undefined) {
    if (!file) return;
    setUploading(category);
    try {
      await uploadCalibrationAttachment(calibrationId, file, category);
      notify("success", "Registro adicionado.");
      invalidate();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setUploading(null);
    }
  }

  async function openAttachment(attachmentId: string) {
    try {
      const url = await getCalibrationAttachmentUrl(calibrationId, attachmentId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteCalibrationAttachment(calibrationId, deleting.id);
      notify("success", "Registro removido.");
      setDeleting(undefined);
      invalidate();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  // O certificado gerado aparece na sua propria area, nao no registro de campo.
  const items = (attachments ?? []).filter((a) => a.id !== certificateAttachmentId);
  const photos = items.filter((a) => a.mimeType.startsWith("image/"));
  const docs = items.filter((a) => !a.mimeType.startsWith("image/"));

  return (
    <div className="card p-5">
      <h2 className="font-semibold text-navy-900">Registro fotografico de campo</h2>
      <p className="mt-1 text-xs text-graphite-500">
        As fotos entram automaticamente como anexo fotografico no certificado gerado.
      </p>

      {canEdit && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {PHOTO_STEPS.map((step) => (
            <div key={step.category}>
              <button
                type="button"
                onClick={() => inputs.current[step.category]?.click()}
                disabled={uploading !== null}
                className="flex w-full items-center gap-2 rounded-lg border border-dashed border-navy-200 bg-navy-50/40 px-3 py-2.5 text-left transition-colors hover:bg-navy-50 disabled:opacity-50"
              >
                {uploading === step.category ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-navy-600" />
                ) : (
                  <Camera className="h-4 w-4 shrink-0 text-navy-600" />
                )}
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-navy-800">{step.label}</span>
                  <span className="block truncate text-xs text-graphite-500">{step.hint}</span>
                </span>
              </button>
              {/* capture="environment" abre a camera traseira direto no celular do tecnico */}
              <input
                ref={(el) => (inputs.current[step.category] = el)}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  void handleFile(step.category, e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
          ))}
        </div>
      )}

      {photos.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative overflow-hidden rounded-lg border border-gray-200">
              <button
                type="button"
                onClick={() => openAttachment(photo.id)}
                className="flex h-24 w-full items-center justify-center bg-navy-50 text-navy-400"
                aria-label={`Abrir ${CATEGORY_LABELS[photo.category]}`}
              >
                <Camera className="h-6 w-6" />
              </button>
              <div className="px-2 py-1.5">
                <p className="truncate text-[11px] font-medium text-graphite-700">
                  {CATEGORY_LABELS[photo.category]}
                </p>
                <p className="truncate text-[10px] text-graphite-400">{formatFileSize(photo.sizeBytes)}</p>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setDeleting(photo)}
                  className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-graphite-500 opacity-0 transition-opacity hover:text-safety-red group-hover:opacity-100"
                  aria-label="Remover foto"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && <p className="mt-4 text-sm text-graphite-500">Nenhuma foto registrada ainda.</p>}

      {/* Anexos complementares (ex.: certificado de laboratorio terceirizado) */}
      <div className="mt-5 border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-navy-900">Anexos complementares</h3>
          {canEdit && (
            <>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => inputs.current.EXTRA?.click()}
                disabled={uploading !== null}
              >
                <Paperclip className="h-4 w-4" /> Anexar
              </button>
              <input
                ref={(el) => (inputs.current.EXTRA = el)}
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  void handleFile("DOCUMENT", e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </>
          )}
        </div>
        {docs.length === 0 ? (
          <p className="mt-2 text-sm text-graphite-500">Nenhum anexo complementar.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {docs.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => openAttachment(doc.id)}
                  className="flex min-w-0 items-center gap-2 text-graphite-700 hover:text-navy-700"
                >
                  <FileText className="h-4 w-4 shrink-0 text-navy-600" />
                  <span className="truncate">{doc.fileName}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 text-graphite-400" />
                </button>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setDeleting(doc)}
                    className="shrink-0 text-graphite-400 hover:text-safety-red"
                    aria-label="Remover anexo"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={!!deleting}
        title="Remover registro"
        description={`Remover "${deleting?.caption || deleting?.fileName}"? Se o certificado ja foi emitido, regere o PDF depois para refletir a mudanca.`}
        confirmLabel="Remover"
        danger
        loading={busy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(undefined)}
      />
    </div>
  );
}
