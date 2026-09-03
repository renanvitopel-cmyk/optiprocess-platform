import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { listClients } from "../api/clients";
import { PageHeader } from "./PageHeader";
import { DataTable } from "./DataTable";
import { StatusBadge } from "./StatusBadge";
import { Modal } from "./Modal";
import { TextInput } from "./form/Field";
import { useToast } from "./Toast";
import { getApiErrorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { clientDisplayName } from "../lib/format";

const schema = z.object({ name: z.string().min(2, "Informe o nome."), code: z.string().optional() });
type FormValues = z.infer<typeof schema>;

interface CatalogItem {
  id: string;
  clientId: string;
  name: string;
  code: string | null;
  active: boolean;
}

interface Props<T extends CatalogItem> {
  title: string;
  description: string;
  itemLabel: string;
  namePlaceholder?: string;
  breadcrumbs: { label: string; to?: string }[];
  base: string;
  list: (params: { clientId?: string; active?: boolean }) => Promise<T[]>;
  create: (input: { name: string; code?: string | null; clientId?: string | null }) => Promise<T>;
  update: (id: string, input: { name?: string; code?: string | null; active?: boolean }) => Promise<T>;
  del: (id: string) => Promise<void>;
}

/** Tela generica de catalogo simples por cliente (Planta, Centro de custo...): lista +
 * criar/editar/desativar/remover, sempre isolado por empresa (seletor de cliente na
 * gestao, forcado a propria empresa no portal). Reaproveitavel por qualquer catalogo
 * novo que seja so {nome, codigo} sem cascata de nivel acima. */
export function SimpleCatalogList<T extends CatalogItem>({
  title, description, itemLabel, namePlaceholder, breadcrumbs, base, list, create, update, del,
}: Props<T>) {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const { user } = useAuth();
  const isClient = user?.role === "CLIENT";
  const canManage = isClient || user?.role === "ADMIN" || user?.role === "TECHNICIAN";
  const [searchParams, setSearchParams] = useSearchParams();
  const clientId = isClient ? user?.clientId ?? "" : searchParams.get("clientId") ?? "";
  const queryKey = `catalog-${base}`;

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);

  const { data: clients } = useQuery({
    queryKey: ["clients-picker-cmms"],
    queryFn: () => listClients({ pageSize: 200, service: "CMMS_MAINTENANCE" }),
    enabled: !isClient,
  });
  const { data, isLoading } = useQuery({
    queryKey: [queryKey, clientId],
    queryFn: () => list({ clientId }),
    enabled: !!clientId,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  function openCreate() {
    reset({ name: "", code: "" });
    setEditing(null);
    setCreateOpen(true);
  }
  function openEdit(item: T) {
    reset({ name: item.name, code: item.code ?? "" });
    setEditing(item);
    setCreateOpen(true);
  }

  async function onSubmit(values: FormValues) {
    const payload = { name: values.name, code: values.code || null };
    try {
      if (editing) {
        await update(editing.id, payload);
        notify("success", `${itemLabel} atualizado(a).`);
      } else {
        await create({ ...payload, clientId });
        notify("success", `${itemLabel} cadastrado(a).`);
      }
      reset();
      setCreateOpen(false);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function toggleActive(item: T) {
    try {
      await update(item.id, { active: !item.active });
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function handleDelete(item: T) {
    try {
      await del(item.id);
      notify("success", `${itemLabel} removido(a).`);
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={breadcrumbs}
        actions={
          canManage &&
          clientId && (
            <button className="btn-primary" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Novo(a) {itemLabel.toLowerCase()}
            </button>
          )
        }
      />

      {!isClient && (
        <div className="mb-4">
          <select
            className="input sm:w-72"
            value={clientId}
            onChange={(e) => setSearchParams(e.target.value ? { clientId: e.target.value } : {})}
          >
            <option value="">Selecione um cliente</option>
            {(clients?.items ?? []).map((c) => (
              <option key={c.id} value={c.id}>{clientDisplayName(c)}</option>
            ))}
          </select>
        </div>
      )}

      {!clientId ? (
        <p className="text-sm text-graphite-500">Selecione um cliente para ver o cadastro.</p>
      ) : (
        <DataTable
          loading={isLoading}
          rows={data ?? []}
          keyField={(i) => i.id}
          emptyTitle={`Nenhum(a) ${itemLabel.toLowerCase()} cadastrado(a)`}
          columns={[
            { header: "Nome", accessor: (i) => <span className="font-medium text-navy-900">{i.name}</span> },
            { header: "Codigo", accessor: (i) => <span className="text-xs text-graphite-500">{i.code ?? "-"}</span> },
            {
              header: "Status",
              accessor: (i) =>
                canManage ? (
                  <button onClick={() => toggleActive(i)} className="cursor-pointer">
                    <StatusBadge status={i.active ? "ACTIVE" : "INACTIVE"} />
                  </button>
                ) : (
                  <StatusBadge status={i.active ? "ACTIVE" : "INACTIVE"} />
                ),
            },
            {
              header: "",
              accessor: (i) =>
                canManage && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(i)} className="text-graphite-400 hover:text-navy-700" aria-label="Editar">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(i)} className="text-graphite-400 hover:text-safety-red" aria-label="Remover">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ),
            },
          ]}
        />
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={editing ? `Editar ${itemLabel.toLowerCase()}` : `Novo(a) ${itemLabel.toLowerCase()}`}
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setCreateOpen(false)}>Cancelar</button>
            <button type="submit" form="simple-catalog-form" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </button>
          </>
        }
      >
        <form id="simple-catalog-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <TextInput label="Nome" required placeholder={namePlaceholder} error={errors.name?.message} {...register("name")} />
          <TextInput label="Codigo (opcional)" placeholder="Ex.: F01" error={errors.code?.message} {...register("code")} />
        </form>
      </Modal>
    </div>
  );
}
