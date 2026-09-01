import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, CheckCircle2, Plus } from "lucide-react";
import {
  addServiceOrderItem,
  deleteServiceOrder,
  deleteServiceOrderItem,
  getServiceOrder,
  approveServiceOrder,
  updateServiceOrderItem,
} from "../../../api/serviceOrders";
import { PageHeader } from "../../../components/PageHeader";
import { FullPageSpinner } from "../../../components/Spinner";
import { StatusBadge } from "../../../components/StatusBadge";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { useAuth } from "../../../auth/AuthContext";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";
import { clientDisplayName, formatDate, formatServiceCategory } from "../../../lib/format";

export default function ServiceOrderDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { notify } = useToast();
  const canManage = user?.role === "ADMIN" || user?.role === "TECHNICIAN" || user?.role === "COMMERCIAL";
  const canApprove = user?.role === "ADMIN" || user?.role === "CLIENT";

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newChecklist, setNewChecklist] = useState("");
  const [newMaterial, setNewMaterial] = useState({ description: "", quantity: "", unit: "" });

  const { data: order, isLoading } = useQuery({ queryKey: ["service-order", id], queryFn: () => getServiceOrder(id) });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["service-order", id] });
    queryClient.invalidateQueries({ queryKey: ["service-orders"] });
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await deleteServiceOrder(id);
      notify("success", "OS removida.");
      navigate("/gestao/ordens-servico");
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleApprove() {
    try {
      await approveServiceOrder(id);
      notify("success", "OS aprovada/concluida pelo cliente.");
      invalidate();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function toggleChecklist(itemId: string, done: boolean) {
    try {
      await updateServiceOrderItem(id, itemId, { done: !done });
      invalidate();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function addChecklistItem() {
    if (!newChecklist.trim()) return;
    try {
      await addServiceOrderItem(id, { type: "CHECKLIST", description: newChecklist.trim() });
      setNewChecklist("");
      invalidate();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function addMaterialItem() {
    if (!newMaterial.description.trim()) return;
    try {
      await addServiceOrderItem(id, {
        type: "MATERIAL",
        description: newMaterial.description.trim(),
        quantity: newMaterial.quantity ? Number(newMaterial.quantity) : undefined,
        unit: newMaterial.unit || undefined,
      });
      setNewMaterial({ description: "", quantity: "", unit: "" });
      invalidate();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function removeItem(itemId: string) {
    try {
      await deleteServiceOrderItem(id, itemId);
      invalidate();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  if (isLoading || !order) return <FullPageSpinner />;

  const checklist = order.items?.filter((i) => i.type === "CHECKLIST") ?? [];
  const materials = order.items?.filter((i) => i.type === "MATERIAL") ?? [];

  return (
    <div>
      <PageHeader
        title={order.number}
        description={clientDisplayName(order.client)}
        breadcrumbs={[{ label: "Ordens de servico", to: "/gestao/ordens-servico" }, { label: order.number }]}
        actions={
          <>
            {canManage && (
              <>
                <button className="btn-outline" onClick={() => navigate(`/gestao/ordens-servico/${id}/editar`)}>
                  <Pencil className="h-4 w-4" /> Editar
                </button>
                <button className="btn-danger" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="h-4 w-4" /> Remover
                </button>
              </>
            )}
            {canApprove && !order.clientApprovedAt && (
              <button className="btn-primary" onClick={handleApprove}>
                <CheckCircle2 className="h-4 w-4" /> Aprovar / concluir
              </button>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card space-y-4 p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={order.status} />
            {order.clientApprovedAt && <span className="text-xs font-medium text-safety-green">Aprovada pelo cliente em {formatDate(order.clientApprovedAt)}</span>}
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info label="Categoria" value={formatServiceCategory(order.category)} />
            <Info label="Local" value={order.siteAddress} />
            <Info label="Tecnico" value={order.technician?.name ?? "-"} />
            <Info label="Horas trabalhadas" value={order.laborHours ? String(order.laborHours) : "-"} />
            <Info label="Agendada para" value={formatDate(order.scheduledDate)} />
            <Info label="Prazo" value={formatDate(order.deadline)} />
          </dl>
          <div>
            <p className="text-xs uppercase tracking-wide text-graphite-400">Descricao</p>
            <p className="mt-1 text-sm text-graphite-700">{order.description}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-navy-900">Checklist</h2>
            <ul className="mb-3 space-y-2">
              {checklist.map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!item.done} onChange={() => toggleChecklist(item.id, !!item.done)} className="h-4 w-4 rounded border-gray-300" />
                  <span className={item.done ? "flex-1 text-graphite-400 line-through" : "flex-1 text-graphite-700"}>{item.description}</span>
                  {canManage && (
                    <button onClick={() => removeItem(item.id)} className="text-graphite-300 hover:text-safety-red" aria-label="Remover">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
              {checklist.length === 0 && <p className="text-sm text-graphite-500">Nenhum item de checklist.</p>}
            </ul>
            {canManage && (
              <div className="flex gap-2">
                <input className="input" placeholder="Novo item" value={newChecklist} onChange={(e) => setNewChecklist(e.target.value)} />
                <button className="btn-ghost btn-sm" onClick={addChecklistItem}><Plus className="h-4 w-4" /></button>
              </div>
            )}
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-navy-900">Materiais utilizados</h2>
            <ul className="mb-3 space-y-2">
              {materials.map((item) => (
                <li key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-graphite-700">{item.description} {item.quantity ? `- ${item.quantity} ${item.unit ?? ""}` : ""}</span>
                  {canManage && (
                    <button onClick={() => removeItem(item.id)} className="text-graphite-300 hover:text-safety-red" aria-label="Remover">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
              {materials.length === 0 && <p className="text-sm text-graphite-500">Nenhum material registrado.</p>}
            </ul>
            {canManage && (
              <div className="grid grid-cols-3 gap-2">
                <input className="input col-span-3" placeholder="Descricao" value={newMaterial.description} onChange={(e) => setNewMaterial((v) => ({ ...v, description: e.target.value }))} />
                <input className="input" placeholder="Qtd" value={newMaterial.quantity} onChange={(e) => setNewMaterial((v) => ({ ...v, quantity: e.target.value }))} />
                <input className="input" placeholder="Unid." value={newMaterial.unit} onChange={(e) => setNewMaterial((v) => ({ ...v, unit: e.target.value }))} />
                <button className="btn-ghost btn-sm" onClick={addMaterialItem}><Plus className="h-4 w-4" /></button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Remover ordem de servico"
        description="Tem certeza que deseja remover esta OS?"
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
