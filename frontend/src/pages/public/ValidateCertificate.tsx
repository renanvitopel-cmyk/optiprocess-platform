import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Search, ShieldCheck, ShieldAlert, ShieldX, Download, QrCode } from "lucide-react";
import { validateCertificate, getPublicCertificatePdfUrl, type CertificateValidationResult } from "../../api/publicApi";
import { formatDate } from "../../lib/format";
import { InlineSpinner } from "../../components/Spinner";

const RESULT_LABELS: Record<string, string> = {
  APPROVED: "Aprovado",
  APPROVED_WITH_RESTRICTION: "Aprovado com ressalva",
  REJECTED: "Reprovado",
};

export default function ValidateCertificate() {
  const { code: codeFromUrl } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [code, setCode] = useState(codeFromUrl ?? "");
  const [result, setResult] = useState<CertificateValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function runValidation(value: string) {
    if (!value.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await validateCertificate(value.trim());
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (codeFromUrl) void runValidation(codeFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeFromUrl]);

  async function handleDownload() {
    const finalCode = result?.certificateNumber ?? code;
    setDownloading(true);
    try {
      const url = await getPublicCertificatePdfUrl(finalCode);
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      <section className="bg-navy-950 py-14 text-white">
        <div className="container-page">
          <div className="mx-auto flex max-w-xl flex-col items-center text-center">
            <QrCode className="h-10 w-10 text-safety-yellow" />
            <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Validação de certificado</h1>
            <p className="mt-3 text-navy-200">
              Digite o número do certificado ou escaneie o QR Code impresso no documento para verificar sua
              autenticidade.
            </p>
          </div>
        </div>
      </section>

      <section className="section-y bg-white">
        <div className="container-page max-w-xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigate(`/validar-certificado/${encodeURIComponent(code.trim())}`);
              void runValidation(code);
            }}
            className="flex gap-2"
          >
            <input
              className="input flex-1"
              placeholder="Ex.: CAL-2026-000123"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button type="submit" className="btn-primary" disabled={loading}>
              <Search className="h-4 w-4" /> Validar
            </button>
          </form>

          <div className="mt-8">
            {loading && <InlineSpinner label="Validando certificado..." />}

            {!loading && result && !result.valid && (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-8 text-center">
                <ShieldX className="h-10 w-10 text-safety-red" />
                <p className="font-semibold text-safety-red">Certificado não encontrado</p>
                <p className="text-sm text-graphite-600">{result.message ?? "Verifique o número informado e tente novamente."}</p>
              </div>
            )}

            {!loading && result?.valid && (
              <div className={`rounded-xl border p-6 ${statusBorderClass(result.status)}`}>
                <div className="flex items-center gap-3">
                  <StatusIcon status={result.status} />
                  <div>
                    <p className="text-lg font-bold text-navy-900">Certificado válido</p>
                    <p className="text-sm text-graphite-500">{statusLabel(result.status)}</p>
                  </div>
                </div>

                <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                  <Field label="Número do certificado" value={result.certificateNumber} />
                  <Field label="Revisão" value={String(result.revisionNumber)} />
                  <Field label="Cliente" value={result.client} />
                  <Field label="Resultado" value={result.result ? RESULT_LABELS[result.result] ?? result.result : "-"} />
                  <Field label="Equipamento" value={result.instrument?.type} />
                  <Field label="Marca / Modelo" value={`${result.instrument?.manufacturer ?? ""} ${result.instrument?.model ?? ""}`} />
                  <Field label="Número de série" value={result.instrument?.serialNumber} />
                  <Field label="Tag / Patrimônio" value={result.instrument?.tag ?? "-"} />
                  <Field label="Data da calibração" value={formatDate(result.calibrationDate)} />
                  <Field label="Validade" value={formatDate(result.validUntil)} />
                </dl>

                {result.pdfAvailable ? (
                  <button type="button" className="btn-secondary mt-6 w-full justify-center" onClick={handleDownload} disabled={downloading}>
                    <Download className="h-4 w-4" /> {downloading ? "Abrindo..." : "Visualizar certificado (PDF)"}
                  </button>
                ) : (
                  <p className="mt-6 text-sm text-graphite-500">O documento em PDF não está disponível para visualização pública.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-graphite-400">{label}</dt>
      <dd className="mt-0.5 font-medium text-graphite-800">{value || "-"}</dd>
    </div>
  );
}

function statusBorderClass(status?: string) {
  if (status === "EXPIRED") return "border-red-200 bg-red-50/40";
  if (status === "DUE_SOON") return "border-amber-200 bg-amber-50/40";
  return "border-green-200 bg-green-50/40";
}

function statusLabel(status?: string) {
  if (status === "EXPIRED") return "Atenção: certificado vencido";
  if (status === "DUE_SOON") return "Próximo do vencimento";
  return "Dentro da validade";
}

function StatusIcon({ status }: { status?: string }) {
  if (status === "EXPIRED") return <ShieldX className="h-10 w-10 text-safety-red" />;
  if (status === "DUE_SOON") return <ShieldAlert className="h-10 w-10 text-safety-yellow-dark" />;
  return <ShieldCheck className="h-10 w-10 text-safety-green" />;
}
