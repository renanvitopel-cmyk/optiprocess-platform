import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { uploadInstrumentPhoto, deleteInstrumentPhoto } from "../api/instruments";
import { useToast } from "./Toast";
import { getApiErrorMessage } from "../api/client";
import { FORMATOS_DE_IMAGEM, problemaNaImagem } from "../lib/imagens";

interface Props {
  instrumentId: string;
  tag?: string | null;
  photoUrl?: string | null;
  /** Quem so consulta ve a foto, mas nao troca. */
  podeEditar: boolean;
  /** Recarregar a ficha depois de trocar/remover. */
  aoMudar: () => void;
}

/**
 * Foto do ativo na propria ficha, sem passar pelo formulario de edicao - e' a coisa que se
 * faz com o celular na mao, na frente da maquina. Mesmo componente na tela da equipe
 * interna e no portal do cliente, pra foto do ativo se comportar igual nos dois lugares.
 */
export function AssetPhoto({ instrumentId, tag, photoUrl, podeEditar, aoMudar }: Props) {
  const { notify } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(arquivo: File) {
    const problema = problemaNaImagem(arquivo);
    if (problema) return notify("error", problema);
    setEnviando(true);
    try {
      await uploadInstrumentPhoto(instrumentId, arquivo);
      notify("success", "Foto do ativo atualizada.");
      aoMudar();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setEnviando(false);
    }
  }

  async function remover() {
    setEnviando(true);
    try {
      await deleteInstrumentPhoto(instrumentId);
      notify("success", "Foto removida.");
      aoMudar();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setEnviando(false);
    }
  }

  const alt = `Foto do ativo ${tag ?? ""}`.trim();

  if (!podeEditar) {
    return photoUrl ? (
      <img src={photoUrl} alt={alt} className="h-16 w-16 rounded-lg border border-gray-200 object-cover" />
    ) : null;
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="group block"
        disabled={enviando}
        onClick={() => inputRef.current?.click()}
        title={photoUrl ? "Trocar a foto do ativo" : "Adicionar uma foto do ativo"}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={alt}
            className="h-16 w-16 rounded-lg border border-gray-200 object-cover group-hover:opacity-80"
          />
        ) : (
          <span className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-gray-300 bg-gray-50 text-graphite-400 group-hover:border-navy-400 group-hover:text-navy-600">
            <Camera className="h-5 w-5" />
            <span className="text-[10px] leading-none">{enviando ? "..." : "Foto"}</span>
          </span>
        )}
      </button>

      {photoUrl && (
        <button
          type="button"
          onClick={remover}
          disabled={enviando}
          aria-label="Remover a foto do ativo"
          title="Remover a foto"
          className="absolute -right-1.5 -top-1.5 rounded-full border border-gray-200 bg-white p-0.5 text-graphite-400 shadow-sm hover:text-safety-red"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={FORMATOS_DE_IMAGEM.join(",")}
        className="hidden"
        onChange={(e) => {
          const arquivo = e.target.files?.[0];
          e.target.value = "";
          if (arquivo) void enviar(arquivo);
        }}
      />
    </div>
  );
}
