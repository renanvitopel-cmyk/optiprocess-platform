import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { approveServiceOrder, getServiceOrder } from "../../api/serviceOrders";
import { PageHeader } from "../../components/PageHeader";
import { FullPageSpinner } from "../../components/Spinner";
import { StatusBadge } from "../../components/StatusBadge";
import { useToast } from "../../components/Toast";
import { getApiErrorMessage } from "../../api/client";
import { formatDate, formatServiceCategory } from "../../lib/format";

export default function PortalServiceOrderDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { notify } = useToast();

  const { data: order, isLoading } = useQuery({ queryKey: ["portal-service-order", id], queryFn: () => getServiceOrder(id) });

  async function handleApprove() {
    try {
      await approveServiceOrder(id);
      notify("success", "Servico aprovado/concluido com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["portal-service-order", id] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  if (isLoading || !order) return <FullPageSpinner />;

  const checklist = order.items?.filter((i) => i.type === "CHECKLIST") ?? [];

  return (
    <div>
      <PageHeader
        title={order.number}
        breadcrumbs={[{ label: "Minhas ordens de servico", to: "/portal/ordens-servico" }, { label: order.number }]}
        actions={
          !order.clientApprovedAt && (
            <button className="btn-primary" onClick={handleApprove}>
              <CheckCircle2 className="h-4 w-4" /> Aprovar / confirmar conclusao
            </button>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card space-y-4 p-5 lg:col-span-2">
          <div className="flex items-center gap-2">
            <StatusBadge status={order.status} />
            {order.clientApprovedAt && <span className="text-xs font-medium text-safety-green">Aprovada em {formatDate(order.clientApprovedAt)}</span>}
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info label="Categoria" value={formatServiceCategory(order.category)} />
            <Info label="Local" value={order.siteAddress} />
            <Info label="Tecnico" value={order.technician?.name ?? "-"} />
            <Info label="Data agendada" value={formatDate(order.scheduledDate)} />
          </dl>
          <div>
            <p className="text-xs uppercase tracking-wide text-graphite-400">Descricao</p>
            <p className="mt-1 text-sm text-graphite-700">{order.description}</p>
          </div>
        </div>

        {checklist.length > 0 && (
          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-navy-900">Checklist executado</h2>
            <ul className="space-y-2">
              {checklist.map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-sm">
                  <span className={`h-2 w-2 rounded-full ${item.done ? "bg-safety-green" : "bg-gray-300"}`} />
                  <span className={item.done ? "text-graphite-700" : "text-graphite-400"}>{item.description}</span>
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
