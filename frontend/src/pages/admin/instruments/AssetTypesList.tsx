import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { listAssetTypes, createAssetType, updateAssetType, deleteAssetType } from "../../../api/assetTypes";
import type { AssetType } from "../../../api/types";
import { PageHeader } from "../../../components/PageHeader";
import { DataTable } from "../../../components/DataTable";
import { StatusBadge } from "../../../components/StatusBadge";
import { Modal } from "../../../components/Modal";
import { TextInput } from "../../../components/form/Field";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";
import { useAuth } from "../../../auth/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({ name: z.string().min(2, "Informe o nome do tipo.") });
type FormValues = z.infer<typeof schema>;

/** Catalogo pre-cadastrado do campo "Tipo de ativo" (motor, compressor, extrusora...) -
 * o mesmo formulario de ativo tambem alimenta esse catalogo ao digitar um tipo novo,
 * essa tela e' so pra ver/organizar/desativar o que ja foi acumulado. */
export default function AssetTypesList() {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const { user } = useAuth();
  const isClient = user?.role === "CLIENT";
  const canManage = isClient || user?.role === "ADMIN" || user?.role === "TECHNICIAN";
  const base = isClient ? "/portal/instrumentos" : "/gestao/instrumentos";
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["asset-types"], queryFn: () => listAssetTypes() });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  function canEdit(type: AssetType) {
    if (!canManage) return false;
    return isClient ? type.clientId === user?.clientId : true;
  }

  async function onSubmit(values: FormValues) {
    try {
      await createAssetType(values);
      notify("success", "Tipo de ativo criado.");
      reset();
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["asset-types"] });
      queryClient.invalidateQueries({ queryKey: ["asset-types-picker"] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function toggleActive(type: AssetType) {
    if (!canEdit(type)) return;
    try {
      await updateAssetType(type.id, { active: !type.active });
      queryClient.invalidateQueries({ queryKey: ["asset-types"] });
      queryClient.invalidateQueries({ queryKey: ["asset-types-picker"] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function handleDelete(type: AssetType) {
    try {
      await deleteAssetType(type.id);
      notify("success", "Tipo removido.");
      queryClient.invalidateQueries({ queryKey: ["asset-types"] });
      queryClient.invalidateQueries({ queryKey: ["asset-types-picker"] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  return (
    <div>
      <PageHeader
        title="Tipos de ativo"
        description="Catalogo usado no campo Tipo de ativo do cadastro"
        breadcrumbs={[{ label: "Ativos", to: base }, { label: "Tipos de ativo" }]}
        actions={
          canManage && (
            <button className="btn-primary" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Novo tipo
            </button>
          )
        }
      />

      <DataTable
        loading={isLoading}
        rows={data ?? []}
        keyField={(t) => t.id}
        emptyTitle="Nenhum tipo cadastrado"
        columns={[
          { header: "Nome", accessor: (t) => <span className="font-medium text-navy-900">{t.name}</span> },
          {
            header: "Origem",
            accessor: (t) => <span className="text-xs text-graphite-500">{t.clientId ? "Meu catalogo" : "Padrao OptiProcess"}</span>,
          },
          {
            header: "Status",
            accessor: (t) =>
              canEdit(t) ? (
                <button onClick={() => toggleActive(t)} className="cursor-pointer">
                  <StatusBadge status={t.active ? "ACTIVE" : "INACTIVE"} />
                </button>
              ) : (
                <StatusBadge status={t.active ? "ACTIVE" : "INACTIVE"} />
              ),
          },
          {
            header: "",
            accessor: (t) =>
              canEdit(t) && (
                <button onClick={() => handleDelete(t)} className="text-graphite-400 hover:text-safety-red" aria-label="Remover tipo">
                  <Trash2 className="h-4 w-4" />
                </button>
              ),
          },
        ]}
      />

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Novo tipo de ativo"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setCreateOpen(false)}>Cancelar</button>
            <button type="submit" form="asset-type-form" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </button>
          </>
        }
      >
        <form id="asset-type-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <TextInput label="Nome" required placeholder="Ex.: Motor, Compressor, Extrusora" error={errors.name?.message} {...register("name")} />
        </form>
      </Modal>
    </div>
  );
}
