import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { changeOrderStatus, getOrder, updateOrder } from "../../../api/orders";
import { PageHeader } from "../../../components/PageHeader";
import { FullPageSpinner } from "../../../components/Spinner";
import { StatusBadge } from "../../../components/StatusBadge";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";
import { clientDisplayName, formatCurrency, formatDateTime } from "../../../lib/format";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "../../../api/types";

const STATUS_FLOW: OrderStatus[] = ["PENDING", "SEPARATED", "DELIVERED"];

export default function OrderDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { notify } = useToast();

  const { data: order, isLoading } = useQuery({ queryKey: ["order", id], queryFn: () => getOrder(id) });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("PENDING");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [statusNote, setStatusNote] = useState("");

  useEffect(() => {
    if (order) {
      setPaymentMethod(order.paymentMethod ?? "");
      setPaymentStatus(order.paymentStatus);
      setPaymentNotes(order.paymentNotes ?? "");
    }
  }, [order]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["order", id] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
  }

  async function handleStatusChange(status: OrderStatus) {
    try {
      await changeOrderStatus(id, status, statusNote || undefined);
      notify("success", "Status do pedido atualizado.");
      setStatusNote("");
      invalidate();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function handleSavePayment() {
    try {
      await updateOrder(id, {
        paymentMethod: paymentMethod || null,
        paymentStatus,
        paymentNotes: paymentNotes || null,
      });
      notify("success", "Informacoes de pagamento salvas.");
      invalidate();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  if (isLoading || !order) return <FullPageSpinner />;

  const currentIndex = STATUS_FLOW.indexOf(order.status);

  return (
    <div>
      <PageHeader
        title={order.number}
        description={clientDisplayName(order.client)}
        breadcrumbs={[{ label: "Pedidos", to: "/gestao/pedidos" }, { label: order.number }]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <StatusBadge status={order.status} />
              <StatusBadge status={order.paymentStatus} />
            </div>

            {order.status !== "CANCELED" && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {STATUS_FLOW.map((s, i) => (
                  <button
                    key={s}
                    disabled={i <= currentIndex}
                    onClick={() => handleStatusChange(s)}
                    className={`btn-sm ${i <= currentIndex ? "btn-outline opacity-50" : "btn-primary"}`}
                  >
                    <StatusBadge status={s} />
                  </button>
                ))}
                <button onClick={() => handleStatusChange("CANCELED")} className="btn-sm btn-danger">Cancelar pedido</button>
              </div>
            )}
            <input className="input" placeholder="Observacao para o historico (opcional)" value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />

            <div className="table-shell mt-4">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Qtd</th>
                    <th>Preco unit.</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.product?.name}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.unitPrice)}</td>
                      <td>{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex justify-end gap-6 text-sm">
              <span className="text-graphite-500">Frete: {formatCurrency(order.shippingCost ?? 0)}</span>
              <span className="font-bold text-navy-900">Total: {formatCurrency(order.totalAmount)}</span>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-navy-900">Historico do pedido</h2>
            <ul className="space-y-2">
              {order.statusHistory.map((h) => (
                <li key={h.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={h.status} />
                    {h.note && <span className="text-graphite-500">{h.note}</span>}
                  </div>
                  <span className="text-xs text-graphite-400">{formatDateTime(h.createdAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-navy-900">Pagamento</h2>
          <div className="space-y-3">
            <div>
              <label className="field-label">Forma de pagamento</label>
              <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                <option value="">Nao informado</option>
                <option value="PIX">Pix</option>
                <option value="BOLETO">Boleto</option>
                <option value="OTHER">Outro</option>
              </select>
            </div>
            <div>
              <label className="field-label">Status do pagamento</label>
              <select className="input" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}>
                <option value="PENDING">Pendente</option>
                <option value="PAID">Pago</option>
              </select>
            </div>
            <div>
              <label className="field-label">Observacoes</label>
              <textarea className="input" rows={3} value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} />
            </div>
            <button className="btn-primary w-full justify-center" onClick={handleSavePayment}>Salvar pagamento</button>
          </div>
        </div>
      </div>
    </div>
  );
}
