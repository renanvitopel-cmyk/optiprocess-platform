import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getInstrument } from "../../api/instruments";
import { PageHeader } from "../../components/PageHeader";
import { FullPageSpinner } from "../../components/Spinner";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDate } from "../../lib/format";
import { EmptyState } from "../../components/EmptyState";

export default function PortalInstrumentDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const { data: instrument, isLoading } = useQuery({ queryKey: ["portal-instrument", id], queryFn: () => getInstrument(id) });

  if (isLoading || !instrument) return <FullPageSpinner />;

  return (
    <div>
      <PageHeader
        title={`${instrument.type} - ${instrument.model}`}
        breadcrumbs={[{ label: "Meus instrumentos", to: "/portal/instrumentos" }, { label: instrument.tag ?? instrument.model }]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card space-y-4 p-5 lg:col-span-2">
          <StatusBadge status={instrument.derivedStatus ?? instrument.status} />
          <dl className="grid gap-4 sm:grid-cols-3">
            <Info label="Tag / Patrimonio" value={instrument.tag ?? "-"} />
            <Info label="Fabricante" value={instrument.manufacturer} />
            <Info label="Numero de serie" value={instrument.serialNumber} />
            <Info label="Faixa de medicao" value={instrument.measurementRange ?? "-"} />
            <Info label="Local de instalacao" value={instrument.installationLocation ?? "-"} />
            <Info label="Periodicidade" value={`${instrument.calibrationFrequencyMonths} meses`} />
            <Info label="Ultima calibracao" value={formatDate(instrument.lastCalibrationDate)} />
            <Info label="Proxima calibracao" value={formatDate(instrument.nextDueDate)} />
          </dl>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-navy-900">Certificados</h2>
          {!instrument.calibrations || instrument.calibrations.length === 0 ? (
            <EmptyState title="Nenhum certificado disponivel" />
          ) : (
            <ul className="divide-y divide-gray-100">
              {instrument.calibrations
                .filter((c) => c.visibleToClient)
                .map((c) => (
                  <li key={c.id}>
                    <Link to={`/portal/certificados/${c.id}`} className="flex items-center justify-between py-2.5 text-sm hover:text-navy-700">
                      <span className="font-medium text-graphite-800">{c.certificateNumber}</span>
                      <StatusBadge status={c.status} />
                    </Link>
                  </li>
                ))}
            </ul>
          )}
        </div>
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
