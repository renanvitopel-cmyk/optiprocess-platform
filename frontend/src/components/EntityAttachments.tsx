import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Trash2, Loader2, ExternalLink, FileText } from "lucide-react";
import type { CalibrationAttachment } from "../api/types";
import { getApiErrorMessage } from "../api/client";
import { useToast } from "./Toast";
import { ConfirmDialog } from "./ConfirmDialog";
import { formatFileSize } from "../lib/format";

interface Props {
  title?: string;
  queryKey: unknown[];
  canEdit: boolean;
  list: () => Promise<CalibrationAttachment[]>;
  upload: (file: File, category: "OTHER" | "DOCUMENT") => Promise<CalibrationAttachment>;
  remove: (attachmentId: string) => Promise<void>;
  getUrl: (attachmentId: string) => Promise<string>;
}

/** Lista/upload/remocao de anexos (fotos e documentos) - mesmo componente usado nas OS
 * de manutencao e nos ativos, so as funcoes de API (bindadas a entidade certa) mudam. */
export function EntityAttachments({ title = "Fotos e anexos", queryKey, canEdit, list, upload, remove, getUrl }: Props) {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<CalibrationAttachment | undefined>();
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { data: attachments } = useQuery({ queryKey, queryFn: list });

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      await upload(file, file.type.startsWith("image/") ? "OTHER" : "DOCUMENT");
      notify("success", "Anexo adicionado.");
      queryClient.invalidateQueries({ queryKey });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setUploading(false);
    }
  }

  async function openAttachment(attachmentId: string) {
    try {
      const url = await getUrl(attachmentId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await remove(deleting.id);
      notify("success", "Anexo removido.");
      setDeleting(undefined);
      queryClient.invalidateQueries({ queryKey });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const items = attachments ?? [];
  const photos = items.filter((a) => a.mimeType.startsWith("image/"));
  const docs = items.filter((a) => !a.mimeType.startsWith("image/"));

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-navy-900">{title}</h2>
        {canEdit && (
          <button type="button" className="btn-ghost btn-sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />} Adicionar
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            void handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      {photos.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative overflow-hidden rounded-lg border border-gray-200">
              <button
                type="button"
                onClick={() => openAttachment(photo.id)}
                className="flex h-24 w-full items-center justify-center bg-navy-50 text-navy-400"
              >
                <Camera className="h-6 w-6" />
              </button>
              <p className="truncate px-2 py-1.5 text-[10px] text-graphite-400">{formatFileSize(photo.sizeBytes)}</p>
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

      {docs.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-gray-100 pt-3">
          {docs.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between text-sm">
              <button type="button" onClick={() => openAttachment(doc.id)} className="flex min-w-0 items-center gap-2 text-graphite-700 hover:text-navy-700">
                <FileText className="h-4 w-4 shrink-0 text-navy-600" />
                <span className="truncate">{doc.fileName}</span>
                <ExternalLink className="h-3 w-3 shrink-0 text-graphite-400" />
              </button>
              {canEdit && (
                <button type="button" onClick={() => setDeleting(doc)} className="shrink-0 text-graphite-400 hover:text-safety-red" aria-label="Remover anexo">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {items.length === 0 && <p className="mt-3 text-sm text-graphite-500">Nenhum anexo ainda.</p>}

      <ConfirmDialog
        open={!!deleting}
        title="Remover anexo"
        description={`Remover "${deleting?.fileName}"?`}
        confirmLabel="Remover"
        danger
        loading={busy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(undefined)}
      />
    </div>
  );
}
