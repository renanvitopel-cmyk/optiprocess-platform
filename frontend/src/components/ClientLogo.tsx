import { useRef, useState } from "react";
import { Image as ImageIcon, X } from "lucide-react";
import { uploadOwnClientLogo, deleteOwnClientLogo } from "../api/clients";
import { useToast } from "./Toast";
import { getApiErrorMessage } from "../api/client";
import { FORMATOS_DE_IMAGEM, problemaNaImagem } from "../lib/imagens";

interface Props {
  companyName: string;
  logoUrl?: string | null;
  podeEditar: boolean;
  aoMudar: () => void;
}

/**
 * Logo da propria empresa, gerenciado pelo cliente em Configuracao > Meu perfil - e' o
 * que substitui a marca do RLP Maintenance no topo do painel do CMMS dela. O logo pequeno
 * da barra lateral do portal continua sendo sempre a marca do produto; este e' so o do
 * painel principal, mesmo padrao de AssetPhoto.
 */
export function ClientLogo({ companyName, logoUrl, podeEditar, aoMudar }: Props) {
  const { notify } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(arquivo: File) {
    const problema = problemaNaImagem(arquivo);
    if (problema) return notify("error", problema);
    setEnviando(true);
    try {
      await uploadOwnClientLogo(arquivo);
      notify("success", "Logo atualizado.");
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
      await deleteOwnClientLogo();
      notify("success", "Logo removido.");
      aoMudar();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setEnviando(false);
    }
  }

  const alt = `Logo de ${companyName}`;

  if (!podeEditar) {
    return logoUrl ? <img src={logoUrl} alt={alt} className="h-16 w-auto max-w-[10rem] rounded-lg border border-gray-200 bg-white object-contain p-1.5" /> : null;
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        className="group block"
        disabled={enviando}
        onClick={() => inputRef.current?.click()}
        title={logoUrl ? "Trocar o logo do cliente" : "Adicionar o logo do cliente"}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={alt}
            className="h-16 w-auto max-w-[10rem] rounded-lg border border-gray-200 bg-white object-contain p-1.5 group-hover:opacity-80"
          />
        ) : (
          <span className="flex h-16 w-32 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-gray-300 bg-gray-50 text-graphite-400 group-hover:border-navy-400 group-hover:text-navy-600">
            <ImageIcon className="h-5 w-5" />
            <span className="text-[10px] leading-none">{enviando ? "..." : "Logo do cliente"}</span>
          </span>
        )}
      </button>

      {logoUrl && (
        <button
          type="button"
          onClick={remover}
          disabled={enviando}
          aria-label="Remover o logo do cliente"
          title="Remover o logo"
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
