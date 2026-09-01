import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { getCalibration, getCalibrationPdfUrl } from "../../api/calibrations";
import { PageHeader } from "../../components/PageHeader";
import { FullPageSpinner } from "../../components/Spinner";
import { StatusBadge } from "../../components/StatusBadge";
import { QRCodeView } from "../../components/QRCodeView";
import { useToast } from "../../components/Toast";
import { getApiErrorMessage } from "../../api/client";
import { formatDate } from "../../lib/format";

export default function PortalCertificateDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const { notify } = useToast();
  const { data: calibration, isLoading } = useQuery({ queryKey: ["portal-certificate", id], queryFn: () => getCalibration(id) });

  async function handleDownload() {
    try {
      const url = await getCalibrationPdfUrl(id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  if (isLoading || !calibration) return <FullPageSpinner />;

  return (
    <div>
      <PageHeader
        title={calibration.certificateNumber}
        description={`${calibration.instrument?.type} - ${calibration.instrument?.model}`}
        breadcrumbs={[{ label: "Meus certificados", to: "/portal/certificados" }, { label: calibration.certificateNumber }]}
        actions={
          calibration.pdfAttachment && (
            <button className="btn-primary" onClick={handleDownload}>
              <Download className="h-4 w-4" /> Baixar PDF
            </button>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card space-y-4 p-5">
            <div className="flex items-center gap-2">
              <StatusBadge status={calibration.status} />
              <StatusBadge status={calibration.result} />
            </div>
            <dl className="grid gap-4 sm:grid-cols-3">
              <Info label="Numero de serie" value={calibration.instrument?.serialNumber ?? "-"} />
              <Info label="Tag / Patrimonio" value={calibration.instrument?.tag ?? "-"} />
              <Info label="Fabricante" value={calibration.instrument?.manufacturer ?? "-"} />
              <Info label="Data da calibracao" value={formatDate(calibration.calibrationDate)} />
              <Info label="Validade" value={formatDate(calibration.validUntil)} />
              <Info label="Local" value={calibration.location} />
              <Info label="Padrao utilizado" value={calibration.standardUsed} />
              <Info label="Rastreabilidade" value={calibration.traceability} />
              <Info label="Tecnico responsavel" value={calibration.technician?.name ?? "-"} />
            </dl>
            <div>
              <p className="text-xs uppercase tracking-wide text-graphite-400">Conclusao tecnica</p>
              <p className="mt-1 text-sm text-graphite-700">{calibration.technicalConclusion}</p>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-navy-900">Pontos calibrados</h2>
            <div className="table-shell">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Valor padrao</th>
                    <th>Valor indicado</th>
                    <th>Erro</th>
                    <th>Tolerancia</th>
                    <th>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {calibration.points.map((p, i) => (
                    <tr key={p.id ?? i}>
                      <td>{p.standardValue}</td>
                      <td>{p.indicatedValue}</td>
                      <td>{p.error}</td>
                      <td>{p.tolerance}</td>
                      <td><StatusBadge status={p.result} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {calibration.qrCodeDataUrl && calibration.qrCodeUrl && (
          <QRCodeView dataUrl={calibration.qrCodeDataUrl} url={calibration.qrCodeUrl} caption="Compartilhe este QR Code para validacao publica" />
        )}
      </div>
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
