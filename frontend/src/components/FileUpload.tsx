import { useRef, useState } from "react";
import { UploadCloud, FileText, Loader2 } from "lucide-react";

interface FileUploadProps {
  accept: string;
  label?: string;
  hint?: string;
  onUpload: (file: File) => Promise<void>;
}

export function FileUpload({ accept, label = "Enviar arquivo", hint, onUpload }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    setFileName(file.name);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div
      className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-navy-200 bg-navy-50/40 px-4 py-6 text-center"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        void handleFiles(e.dataTransfer.files);
      }}
    >
      {uploading ? (
        <Loader2 className="h-6 w-6 animate-spin text-navy-600" />
      ) : fileName ? (
        <FileText className="h-6 w-6 text-navy-600" />
      ) : (
        <UploadCloud className="h-6 w-6 text-navy-400" />
      )}
      <p className="text-sm font-medium text-navy-800">{uploading ? "Enviando..." : fileName ?? label}</p>
      {hint && !uploading && <p className="text-xs text-graphite-500">{hint}</p>}
      <button type="button" className="btn-outline btn-sm mt-1" onClick={() => inputRef.current?.click()} disabled={uploading}>
        Escolher arquivo
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
    </div>
  );
}
