import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMaintenanceWorkOrder } from "../../api/maintenanceWorkOrders";
import { PageHeader } from "../../components/PageHeader";
import { FullPageSpinner } from "../../components/Spinner";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDateTime } from "../../lib/format";

const TYPE_LABELS: Record<string, string> = { PREVENTIVE: "Preventiva", CORRECTIVE: "Corretiva", PREDICTIVE: "Preditiva" };
const RESULT_LABELS: Record<string, string> = { PENDING: "Pendente", OK: "OK", NOT_OK: "Nao OK", NA: "N/A" };

export default function PortalMaintenanceWorkOrderDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const { data: workOrder, isLoading } = useQuery({
    queryKey: ["portal-maintenance-work-order", id],
    queryFn: () => getMaintenanceWorkOrder(id),
  });

  if (isLoading || !workOrder) return <FullPageSpinner />;

  return (
    <div>
      <PageHeader
        title={workOrder.number}
        breadcrumbs={[{ label: "RLP Maintenance CMMS", to: "/portal/manutencao" }, { label: workOrder.number }]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card space-y-4 p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={workOrder.status} />
            <span className="rounded-full border border-navy-200 bg-navy-50 px-2.5 py-0.5 text-xs font-medium text-navy-700">
              {TYPE_LABELS[workOrder.type]}
            </span>
          </div>
          <p className="text-sm text-graphite-700">{workOrder.description}</p>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info label="Ativo" value={workOrder.instrument?.tag ?? "-"} />
            <Info label="Tecnico" value={workOrder.technician?.name ?? "-"} />
            <Info label="Iniciada em" value={formatDateTime(workOrder.startedAt)} />
            <Info label="Concluida em" value={formatDateTime(workOrder.completedAt)} />
          </dl>
        </div>

        {workOrder.checklist && workOrder.checklist.length > 0 && (
          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-navy-900">Checklist executado</h2>
            <ul className="space-y-2 text-sm">
              {workOrder.checklist.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2">
                  <span className="text-graphite-700">{item.description}</span>
                  <span className="shrink-0 text-xs font-medium text-graphite-500">{RESULT_LABELS[item.result]}</span>
                </li>
              ))}
            </ul>
          </div>
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
