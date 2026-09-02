import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Gauge, ClipboardList, FileSignature, Star } from "lucide-react";
import { deleteClient, getClient } from "../../../api/clients";
import { PageHeader } from "../../../components/PageHeader";
import { FullPageSpinner } from "../../../components/Spinner";
import { StatusBadge } from "../../../components/StatusBadge";
import { ClientFormModal } from "./ClientFormModal";
import { ClientContactsCard } from "./ClientContactsCard";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { useAuth } from "../../../auth/AuthContext";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";
import { formatServiceCategory } from "../../../lib/format";

export default function ClientDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { notify } = useToast();
  const canManage = user?.role === "ADMIN" || user?.role === "COMMERCIAL";

  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: client, isLoading } = useQuery({ queryKey: ["client", id], queryFn: () => getClient(id) });

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteClient(id);
      notify("success", "Cliente removido.");
      navigate("/gestao/clientes");
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  }

  if (isLoading || !client) return <FullPageSpinner />;

  return (
    <div>
      <PageHeader
        title={client.tradeName || client.companyName}
        description={client.companyName}
        breadcrumbs={[{ label: "Clientes", to: "/gestao/clientes" }, { label: client.tradeName || client.companyName }]}
        actions={
          canManage && (
            <>
              <button className="btn-outline" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" /> Editar
              </button>
              <button className="btn-danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4" /> Remover
              </button>
            </>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card space-y-4 p-5 lg:col-span-2">
          <div className="flex items-center gap-2">
            <StatusBadge status={client.status} />
            {client.cnpj && <span className="text-sm text-graphite-500">CNPJ {client.cnpj}</span>}
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info label="Endereco" value={[client.addressStreet, client.addressNumber, client.addressDistrict].filter(Boolean).join(", ") || "-"} />
            <Info label="Cidade/UF" value={[client.addressCity, client.addressState].filter(Boolean).join("/") || "-"} />
            <Info label="Telefone" value={client.phone ?? "-"} />
            <Info label="WhatsApp" value={client.whatsapp ?? "-"} />
            <Info label="E-mail" value={client.email ?? "-"} />
            <Info label="Inscricao estadual" value={client.stateRegistration ?? "-"} />
            <Info label="Responsavel tecnico" value={client.technicalContactName ?? "-"} />
            <Info label="Responsavel comercial" value={client.commercialContactName ?? "-"} />
          </dl>
          <div>
            <p className="text-xs uppercase tracking-wide text-graphite-400">Servicos contratados</p>
            {client.contractedServices && client.contractedServices.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {client.contractedServices.map((s) => (
                  <li
                    key={s}
                    className="rounded-full border border-navy-200 bg-navy-50 px-2.5 py-1 text-xs font-medium text-navy-700"
                  >
                    {formatServiceCategory(s)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-graphite-500">Nenhum servico marcado.</p>
            )}
          </div>

          {client.notes && (
            <div>
              <p className="text-xs uppercase tracking-wide text-graphite-400">Observacoes</p>
              <p className="mt-1 text-sm text-graphite-700">{client.notes}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-navy-900">Resumo</h2>
            <div className="space-y-2 text-sm">
              <SummaryRow icon={Gauge} label="Instrumentos" value={client._count?.instruments ?? 0} to={`/gestao/instrumentos?clientId=${id}`} />
              <SummaryRow icon={ClipboardList} label="Ordens de servico" value={client._count?.serviceOrders ?? 0} to={`/gestao/ordens-servico?clientId=${id}`} />
              <SummaryRow icon={FileSignature} label="Contratos" value={client._count?.contracts ?? 0} to={`/gestao/contratos?clientId=${id}`} />
              <SummaryRow icon={Star} label="Certificados" value={client._count?.calibrations ?? 0} to={`/gestao/calibracoes?clientId=${id}`} />
            </div>
          </div>

          <ClientContactsCard clientId={id} contacts={client.contacts ?? []} canManage={!!canManage} />
        </div>
      </div>

      <ClientFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        client={client}
        onSaved={() => {
          setEditOpen(false);
          queryClient.invalidateQueries({ queryKey: ["client", id] });
          queryClient.invalidateQueries({ queryKey: ["clients"] });
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Remover cliente"
        description={`Tem certeza que deseja remover ${client.companyName}? O historico sera preservado, mas o cliente deixara de aparecer nas listagens.`}
        confirmLabel="Remover"
        danger
        loading={deleting}
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

function SummaryRow({ icon: Icon, label, value, to }: { icon: typeof Gauge; label: string; value: number; to: string }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-navy-50"
    >
      <span className="flex items-center gap-2 text-graphite-600">
        <Icon className="h-4 w-4 text-navy-500" /> {label}
      </span>
      <span className="font-semibold text-navy-900">{value}</span>
    </button>
  );
}
