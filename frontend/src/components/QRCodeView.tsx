import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface QRCodeViewProps {
  dataUrl: string;
  url: string;
  caption?: string;
}

export function QRCodeView({ dataUrl, url, caption }: QRCodeViewProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-center">
      <img src={dataUrl} alt="QR Code de validacao do certificado" className="h-40 w-40" />
      {caption && <p className="text-xs text-graphite-500">{caption}</p>}
      <button type="button" onClick={copyLink} className="btn-outline btn-sm w-full">
        {copied ? <Check className="h-4 w-4 text-safety-green" /> : <Copy className="h-4 w-4" />}
        {copied ? "Link copiado" : "Copiar link publico"}
      </button>
    </div>
  );
}
