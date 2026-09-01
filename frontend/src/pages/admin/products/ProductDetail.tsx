import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Plus, ArrowDownCircle, ArrowUpCircle, Settings2 } from "lucide-react";
import { createInventoryMovement, deleteProduct, getProduct, listInventoryMovements } from "../../../api/products";
import { PageHeader } from "../../../components/PageHeader";
import { FullPageSpinner } from "../../../components/Spinner";
import { StatusBadge } from "../../../components/StatusBadge";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { ProductFormModal } from "./ProductFormModal";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";
import { formatCurrency, formatDateTime } from "../../../lib/format";
import type { InventoryMovementType } from "../../../api/types";

export default function ProductDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [movement, setMovement] = useState<{ type: InventoryMovementType; quantity: string; reason: string }>({
    type: "IN",
    quantity: "",
    reason: "",
  });

  const { data: product, isLoading } = useQuery({ queryKey: ["product", id], queryFn: () => getProduct(id) });
  const { data: movements } = useQuery({ queryKey: ["inventory-movements", id], queryFn: () => listInventoryMovements(id) });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["product", id] });
    queryClient.invalidateQueries({ queryKey: ["inventory-movements", id] });
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await deleteProduct(id);
      notify("success", "Produto removido.");
      navigate("/gestao/produtos");
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleMovement() {
    if (!movement.quantity) return;
    try {
      await createInventoryMovement(id, { type: movement.type, quantity: Number(movement.quantity), reason: movement.reason || undefined });
      notify("success", "Movimentacao registrada.");
      setMovement({ type: "IN", quantity: "", reason: "" });
      invalidate();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  if (isLoading || !product) return <FullPageSpinner />;

  return (
    <div>
      <PageHeader
        title={product.name}
        description={`SKU: ${product.sku}`}
        breadcrumbs={[{ label: "Produtos", to: "/gestao/produtos" }, { label: product.name }]}
        actions={
          <>
            <button className="btn-outline" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" /> Editar
            </button>
            <button className="btn-danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" /> Remover
            </button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card space-y-4 p-5 lg:col-span-2">
          <div className="flex items-center gap-2">
            <StatusBadge status={product.status} />
            {product.featured && <span className="text-xs font-medium text-safety-yellow-dark">Destaque no site</span>}
          </div>
          <dl className="grid gap-4 sm:grid-cols-3">
            <Info label="Categoria" value={product.category?.name ?? "-"} />
            <Info label="Marca" value={product.brand ?? "-"} />
            <Info label="Preco" value={product.priceOnRequest ? "Sob consulta" : formatCurrency(product.price)} />
            <Info label="Preco promocional" value={product.promoPrice ? formatCurrency(product.promoPrice) : "-"} />
            <Info label="Estoque atual" value={String(product.stockQty)} />
            <Info label="Estoque minimo" value={String(product.minStock)} />
          </dl>
          {product.description && (
            <div>
              <p className="text-xs uppercase tracking-wide text-graphite-400">Descricao</p>
              <p className="mt-1 text-sm text-graphite-700">{product.description}</p>
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-navy-900">
            <Settings2 className="h-4 w-4" /> Movimentar estoque
          </h2>
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMovement((m) => ({ ...m, type: "IN" }))}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${movement.type === "IN" ? "border-safety-green bg-green-50 text-safety-green-dark" : "border-gray-200 text-graphite-600"}`}
              >
                <ArrowDownCircle className="mx-auto mb-1 h-4 w-4" /> Entrada
              </button>
              <button
                type="button"
                onClick={() => setMovement((m) => ({ ...m, type: "OUT" }))}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${movement.type === "OUT" ? "border-safety-red bg-red-50 text-safety-red" : "border-gray-200 text-graphite-600"}`}
              >
                <ArrowUpCircle className="mx-auto mb-1 h-4 w-4" /> Saida
              </button>
              <button
                type="button"
                onClick={() => setMovement((m) => ({ ...m, type: "ADJUSTMENT" }))}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${movement.type === "ADJUSTMENT" ? "border-navy-500 bg-navy-50 text-navy-700" : "border-gray-200 text-graphite-600"}`}
              >
                <Settings2 className="mx-auto mb-1 h-4 w-4" /> Ajuste
              </button>
            </div>
            <input
              type="number"
              className="input"
              placeholder={movement.type === "ADJUSTMENT" ? "Novo saldo total" : "Quantidade"}
              value={movement.quantity}
              onChange={(e) => setMovement((m) => ({ ...m, quantity: e.target.value }))}
            />
            <input className="input" placeholder="Motivo (opcional)" value={movement.reason} onChange={(e) => setMovement((m) => ({ ...m, reason: e.target.value }))} />
            <button className="btn-primary w-full justify-center" onClick={handleMovement}>
              <Plus className="h-4 w-4" /> Registrar
            </button>
          </div>

          <div className="mt-5 max-h-64 overflow-y-auto">
            <h3 className="mb-2 text-xs font-semibold uppercase text-graphite-400">Historico</h3>
            <ul className="space-y-2">
              {movements?.map((m) => (
                <li key={m.id} className="flex items-center justify-between text-sm">
                  <span className="text-graphite-600">{formatDateTime(m.createdAt)}</span>
                  <span className={m.type === "OUT" ? "font-semibold text-safety-red" : "font-semibold text-safety-green"}>
                    {m.type === "OUT" ? "-" : "+"}
                    {m.quantity}
                  </span>
                </li>
              ))}
              {(!movements || movements.length === 0) && <p className="text-sm text-graphite-500">Nenhuma movimentacao.</p>}
            </ul>
          </div>
        </div>
      </div>

      <ProductFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        product={product}
        onSaved={() => {
          setEditOpen(false);
          invalidate();
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Remover produto"
        description={`Tem certeza que deseja remover "${product.name}"?`}
        confirmLabel="Remover"
        danger
        loading={busy}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
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
