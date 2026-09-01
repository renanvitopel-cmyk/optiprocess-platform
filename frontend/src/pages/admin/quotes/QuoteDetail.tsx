import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Mail, Phone } from "lucide-react";
import { approveQuote, getQuote, rejectQuote, updateQuote } from "../../../api/quotes";
import { PageHeader } from "../../../components/PageHeader";
import { FullPageSpinner } from "../../../components/Spinner";
import { StatusBadge } from "../../../components/StatusBadge";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";
import { clientDisplayName, formatCurrency, formatDate, formatServiceCategory } from "../../../lib/format";

const SOURCE_LABELS: Record<string, string> = {
  SERVICE_REQUEST: "Solicitacao de servico",
  PRODUCT_CART: "Carrinho de produtos",
  CONTACT: "Formulario de contato",
};

export default function QuoteDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useToast();

  const { data: quote, isLoading } = useQuery({ queryKey: ["quote", id], queryFn: () => getQuote(id) });

  const [prices, setPrices] = useState<Record<string, string>>({});
  const [shippingCost, setShippingCost] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (quote) {
      setPrices(Object.fromEntries(quote.items.map((i) => [i.id, i.unitPriceOffered != null ? String(i.unitPriceOffered) : ""])));
      setShippingCost(quote.shippingCost != null ? String(quote.shippingCost) : "");
      setNotes(quote.notes ?? "");
    }
  }, [quote]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["quote", id] });
    queryClient.invalidateQueries({ queryKey: ["quotes"] });
  }

  async function handleSavePrices() {
    setBusy(true);
    try {
      await updateQuote(id, {
        status: "QUOTE_SENT",
        shippingCost: shippingCost ? Number(shippingCost) : null,
        notes,
        items: Object.entries(prices).map(([itemId, value]) => ({ id: itemId, unitPriceOffered: value ? Number(value) : null })),
      });
      notify("success", "Orcamento atualizado e marcado como enviado.");
      invalidate();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleApprove() {
    setBusy(true);
    try {
      const order = await approveQuote(id);
      notify("success", `Pedido ${order.number} criado.`);
      navigate(`/gestao/pedidos/${order.id}`);
    } catch (error) {
      notify("error", getApiErrorMessage(error));
      setBusy(false);
    }
  }

  async function handleReject() {
    setBusy(true);
    try {
      await rejectQuote(id);
      notify("success", "Orcamento recusado.");
      invalidate();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setBusy(false);
      setConfirmReject(false);
    }
  }

  if (isLoading || !quote) return <FullPageSpinner />;

  const canDecide = quote.status !== "APPROVED" && quote.status !== "REJECTED";

  return (
    <div>
      <PageHeader
        title={quote.number}
        description={SOURCE_LABELS[quote.source] ?? quote.source}
        breadcrumbs={[{ label: "Orcamentos", to: "/gestao/orcamentos" }, { label: quote.number }]}
        actions={
          canDecide && (
            <>
              <button className="btn-danger" onClick={() => setConfirmReject(true)}>
                <XCircle className="h-4 w-4" /> Recusar
              </button>
              {quote.items.length > 0 && (
                <button className="btn-primary" onClick={() => setConfirmApprove(true)}>
                  <CheckCircle2 className="h-4 w-4" /> Aprovar e gerar pedido
                </button>
              )}
            </>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card space-y-3 p-5">
            <StatusBadge status={quote.status} />
            <dl className="grid gap-4 sm:grid-cols-2">
              <Info label="Contato" value={quote.contactName} />
              <Info label="Cliente vinculado" value={quote.client ? clientDisplayName(quote.client) : "Nao vinculado (visitante)"} />
              <Info label="Data" value={formatDate(quote.createdAt)} />
              {quote.serviceCategory && <Info label="Tipo de servico" value={formatServiceCategory(quote.serviceCategory)} />}
            </dl>
            <div className="flex gap-4 text-sm text-navy-700">
              <a href={`mailto:${quote.contactEmail}`} className="flex items-center gap-1.5 hover:underline">
                <Mail className="h-4 w-4" /> {quote.contactEmail}
              </a>
              {quote.contactPhone && (
                <a href={`tel:${quote.contactPhone}`} className="flex items-center gap-1.5 hover:underline">
                  <Phone className="h-4 w-4" /> {quote.contactPhone}
                </a>
              )}
            </div>
            {quote.message && (
              <div>
                <p className="text-xs uppercase tracking-wide text-graphite-400">Mensagem</p>
                <p className="mt-1 text-sm text-graphite-700">{quote.message}</p>
              </div>
            )}
          </div>

          {quote.items.length > 0 && (
            <div className="card p-5">
              <h2 className="mb-3 font-semibold text-navy-900">Itens solicitados</h2>
              <div className="table-shell">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>Qtd</th>
                      <th>Preco de referencia</th>
                      <th>Preco a oferecer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quote.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.product?.name}</td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.product?.price)}</td>
                        <td>
                          <input
                            className="input w-32"
                            type="number"
                            step="0.01"
                            value={prices[item.id] ?? ""}
                            onChange={(e) => setPrices((p) => ({ ...p, [item.id]: e.target.value }))}
                            disabled={!canDecide}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {canDecide && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="field-label">Frete</label>
                    <input className="input" type="number" step="0.01" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} />
                  </div>
                  <div>
                    <label className="field-label">Observacoes internas</label>
                    <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>
                </div>
              )}

              {canDecide && (
                <button className="btn-outline mt-4" onClick={handleSavePrices} disabled={busy}>
                  Salvar precos e marcar como enviado
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmApprove}
        title="Aprovar orcamento"
        description="Um pedido sera criado com os precos definidos. Certifique-se de ter preenchido o preco de todos os itens."
        confirmLabel="Aprovar"
        loading={busy}
        onConfirm={handleApprove}
        onCancel={() => setConfirmApprove(false)}
      />
      <ConfirmDialog
        open={confirmReject}
        title="Recusar orcamento"
        description="Tem certeza que deseja recusar esta solicitacao?"
        confirmLabel="Recusar"
        danger
        loading={busy}
        onConfirm={handleReject}
        onCancel={() => setConfirmReject(false)}
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
