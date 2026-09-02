import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, RefreshCw, Eye, EyeOff, FileText, ExternalLink, FileDown } from "lucide-react";
import {
  getCalibration,
  getCalibrationHistory,
  issueCalibration,
  reviseCalibration,
  setCalibrationVisibility,
  regenerateCertificatePdf,
  getCalibrationPdfUrl,
} from "../../../api/calibrations";
import { CalibrationPhotos } from "./CalibrationPhotos";
import { PageHeader } from "../../../components/PageHeader";
import { FullPageSpinner } from "../../../components/Spinner";
import { StatusBadge } from "../../../components/StatusBadge";
import { QRCodeView } from "../../../components/QRCodeView";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { useAuth } from "../../../auth/AuthContext";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";
import { clientDisplayName, formatDate, formatFileSize } from "../../../lib/format";

export default function CalibrationDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { notify } = useToast();
  const canManage = user?.role === "ADMIN" || user?.role === "TECHNICIAN";

  const [confirmIssue, setConfirmIssue] = useState(false);
  const [confirmRevise, setConfirmRevise] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: calibration, isLoading } = useQuery({ queryKey: ["calibration", id], queryFn: () => getCalibration(id) });
  const { data: history } = useQuery({ queryKey: ["calibration-history", id], queryFn: () => getCalibrationHistory(id) });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["calibration", id] });
    queryClient.invalidateQueries({ queryKey: ["calibration-history", id] });
    queryClient.invalidateQueries({ queryKey: ["calibrations"] });
  }

  async function handleRegeneratePdf() {
    setBusy(true);
    try {
      await regenerateCertificatePdf(id);
      notify("success", "PDF do certificado regerado.");
      invalidate();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleIssue() {
    setBusy(true);
    try {
      await issueCalibration(id);
      notify("success", "Certificado emitido.");
      invalidate();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setBusy(false);
      setConfirmIssue(false);
    }
  }

  async function handleRevise() {
    setBusy(true);
    try {
      const revised = await reviseCalibration(id);
      notify("success", `Revisao ${revised.revisionNumber} criada.`);
      window.location.href = `/gestao/calibracoes/${revised.id}`;
    } catch (error) {
      notify("error", getApiErrorMessage(error));
      setBusy(false);
    }
  }

  async function handleToggleVisibility() {
    if (!calibration) return;
    try {
      await setCalibrationVisibility(id, !calibration.visibleToClient);
      notify("success", calibration.visibleToClient ? "Ocultado do portal do cliente." : "Liberado para o portal do cliente.");
      invalidate();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function handleViewPdf() {
    try {
      const url = await getCalibrationPdfUrl(id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  if (isLoading || !calibration) return <FullPageSpinner />;

  const isDraft = calibration.status === "DRAFT";
  const isLatestRevision = !history || history[history.length - 1]?.id === calibration.id;

  return (
    <div>
      <PageHeader
        title={calibration.certificateNumber}
        description={`Cliente: ${clientDisplayName(calibration.client)}`}
        breadcrumbs={[{ label: "Calibracoes", to: "/gestao/calibracoes" }, { label: calibration.certificateNumber }]}
        actions={
          canManage && (
            <>
              {isDraft && (
                <button className="btn-primary" onClick={() => setConfirmIssue(true)}>
                  <CheckCircle2 className="h-4 w-4" /> Emitir certificado
                </button>
              )}
              {!isDraft && isLatestRevision && (
                <button className="btn-outline" onClick={() => setConfirmRevise(true)}>
                  <RefreshCw className="h-4 w-4" /> Criar nova revisao
                </button>
              )}
              {!isDraft && (
                <button className="btn-outline" onClick={handleToggleVisibility}>
                  {calibration.visibleToClient ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {calibration.visibleToClient ? "Ocultar do cliente" : "Liberar para o cliente"}
                </button>
              )}
            </>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card space-y-4 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={calibration.status} />
              <StatusBadge status={calibration.result} />
              {calibration.visibleToClient ? (
                <span className="text-xs font-medium text-safety-green">Visivel no portal do cliente</span>
              ) : (
                <span className="text-xs font-medium text-graphite-400">Oculto do portal do cliente</span>
              )}
              <span className="text-xs text-graphite-400">Revisao {calibration.revisionNumber}</span>
            </div>

            <dl className="grid gap-4 sm:grid-cols-3">
              <Info label="Instrumento" value={`${calibration.instrument?.type} - ${calibration.instrument?.model}`} />
              <Info label="Numero de serie" value={calibration.instrument?.serialNumber ?? "-"} />
              <Info label="Tecnico" value={calibration.technician?.name ?? "-"} />
              <Info label="Data da calibracao" value={formatDate(calibration.calibrationDate)} />
              <Info label="Validade" value={formatDate(calibration.validUntil)} />
              <Info label="Local" value={calibration.location} />
              <Info label="Metodo / procedimento" value={calibration.procedure || "-"} />
              <Info label="Fator de abrangencia" value={calibration.coverageFactorK ? `k = ${calibration.coverageFactorK}` : "-"} />
              <Info
                label="Condicoes ambientais"
                value={
                  calibration.ambientTemperature != null
                    ? `${calibration.ambientTemperature}°C / ${calibration.ambientHumidity ?? "-"}% UR`
                    : "-"
                }
              />
            </dl>

            <div>
              <p className="text-xs uppercase tracking-wide text-graphite-400">Conclusao tecnica</p>
              <p className="mt-1 text-sm text-graphite-700">{calibration.technicalConclusion}</p>
            </div>
          </div>

          {calibration.standards && calibration.standards.length > 0 && (
            <div className="card p-5">
              <h2 className="mb-3 font-semibold text-navy-900">Padroes utilizados e rastreabilidade</h2>
              <div className="table-shell">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Padrao</th>
                      <th>Fabricante / Modelo</th>
                      <th>N. de serie</th>
                      <th>Certificado</th>
                      <th>Validade</th>
                      <th>Laboratorio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calibration.standards.map((s, i) => (
                      <tr key={s.id ?? i}>
                        <td className="font-medium text-navy-900">{s.description}</td>
                        <td>{[s.manufacturer, s.model].filter(Boolean).join(" / ") || "-"}</td>
                        <td>{s.serialNumber || "-"}</td>
                        <td>{s.certificateNumber || "-"}</td>
                        <td>{formatDate(s.certificateValidUntil)}</td>
                        <td>{s.laboratory || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
                    <th>Incerteza</th>
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
                      <td>{p.uncertainty}</td>
                      <td><StatusBadge status={p.result} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {history && history.length > 1 && (
            <div className="card p-5">
              <h2 className="mb-3 font-semibold text-navy-900">Historico de revisoes</h2>
              <ul className="divide-y divide-gray-100">
                {history.map((h) => (
                  <li key={h.id} className="flex items-center justify-between py-2 text-sm">
                    <Link
                      to={`/gestao/calibracoes/${h.id}`}
                      className={`hover:underline ${h.id === calibration.id ? "font-semibold text-navy-900" : "text-graphite-600"}`}
                    >
                      Revisao {h.revisionNumber} - {h.certificateNumber}
                    </Link>
                    <StatusBadge status={h.status} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {calibration.qrCodeDataUrl && calibration.qrCodeUrl && (
            <QRCodeView dataUrl={calibration.qrCodeDataUrl} url={calibration.qrCodeUrl} caption="Validacao publica do certificado" />
          )}

          <div className="card p-5">
            <h2 className="mb-1 font-semibold text-navy-900">Certificado (PDF)</h2>
            <p className="mb-3 text-xs text-graphite-500">
              Gerado pela plataforma no momento da emissao, com os dados, padroes, pontos, QR Code e as fotos.
            </p>
            {calibration.pdfAttachment ? (
              <>
                <div className="flex items-center justify-between rounded-md border border-gray-200 p-3 text-sm">
                  <div className="flex min-w-0 items-center gap-2 text-graphite-700">
                    <FileText className="h-4 w-4 shrink-0 text-navy-600" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{calibration.pdfAttachment.fileName}</p>
                      <p className="text-xs text-graphite-400">{formatFileSize(calibration.pdfAttachment.sizeBytes)}</p>
                    </div>
                  </div>
                  <button type="button" onClick={handleViewPdf} className="shrink-0 text-navy-700 hover:text-navy-900" aria-label="Abrir PDF">
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
                {canManage && (
                  <button type="button" className="btn-outline btn-sm mt-3 w-full justify-center" onClick={handleRegeneratePdf} disabled={busy}>
                    <RefreshCw className="h-4 w-4" /> Regerar PDF
                  </button>
                )}
              </>
            ) : (
              <div className="rounded-md border border-dashed border-gray-300 p-4 text-center">
                <FileDown className="mx-auto h-6 w-6 text-graphite-300" />
                <p className="mt-2 text-sm text-graphite-500">
                  O PDF sera gerado automaticamente ao emitir o certificado.
                </p>
              </div>
            )}
          </div>

          <CalibrationPhotos
            calibrationId={id}
            canEdit={!!canManage}
            certificateAttachmentId={calibration.pdfAttachment?.id}
          />
        </div>
      </div>

      <ConfirmDialog
        open={confirmIssue}
        title="Emitir certificado"
        description="Apos a emissao, este certificado nao podera mais ser editado. Para corrigir dados, sera necessario criar uma nova revisao. Deseja continuar?"
        confirmLabel="Emitir"
        loading={busy}
        onConfirm={handleIssue}
        onCancel={() => setConfirmIssue(false)}
      />
      <ConfirmDialog
        open={confirmRevise}
        title="Criar nova revisao"
        description="Sera criado um novo rascunho com os mesmos dados desta revisao, para voce corrigir e emitir novamente."
        confirmLabel="Criar revisao"
        loading={busy}
        onConfirm={handleRevise}
        onCancel={() => setConfirmRevise(false)}
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
