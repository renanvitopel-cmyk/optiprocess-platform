import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { listFailureCodes, createFailureCode, updateFailureCode, deleteFailureCode } from "../../../api/failureCodes";
import type { FailureCode } from "../../../api/types";
import { PageHeader } from "../../../components/PageHeader";
import { DataTable } from "../../../components/DataTable";
import { StatusBadge } from "../../../components/StatusBadge";
import { Modal } from "../../../components/Modal";
import { TextInput } from "../../../components/form/Field";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";
import { useCmms } from "../../../lib/cmms";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  code: z.string().min(1, "Informe o codigo."),
  description: z.string().min(2, "Informe a descricao."),
  category: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function FailureCodesList() {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const { canManage, isClient, ownClientId, base } = useCmms();
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["failure-codes"], queryFn: () => listFailureCodes() });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  // Codigos sem clientId sao o catalogo padrao da OptiProcess: o cliente usa, mas nao edita.
  function canEdit(code: FailureCode) {
    if (!canManage) return false;
    return isClient ? code.clientId === ownClientId : true;
  }

  async function onSubmit(values: FormValues) {
    try {
      await createFailureCode(values);
      notify("success", "Codigo de falha criado.");
      reset();
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["failure-codes"] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function toggleActive(code: FailureCode) {
    if (!canEdit(code)) return;
    try {
      await updateFailureCode(code.id, { active: !code.active });
      queryClient.invalidateQueries({ queryKey: ["failure-codes"] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function handleDelete(code: FailureCode) {
    try {
      await deleteFailureCode(code.id);
      notify("success", "Codigo removido.");
      queryClient.invalidateQueries({ queryKey: ["failure-codes"] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  return (
    <div>
      <PageHeader
        title="Codigos de falha"
        description="Catalogo de causas usado nas ordens de manutencao corretivas"
        breadcrumbs={[{ label: "RLP Maintenance CMMS", to: base }, { label: "Codigos de falha" }]}
        actions={
          canManage && (
            <button className="btn-primary" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Novo codigo
            </button>
          )
        }
      />

      <DataTable
        loading={isLoading}
        rows={data ?? []}
        keyField={(c) => c.id}
        emptyTitle="Nenhum codigo de falha cadastrado"
        columns={[
          { header: "Codigo", accessor: (c) => <span className="font-mono font-medium text-navy-900">{c.code}</span> },
          { header: "Descricao", accessor: (c) => c.description },
          { header: "Categoria", accessor: (c) => c.category ?? "-" },
          {
            header: "Origem",
            accessor: (c) => (
              <span className="text-xs text-graphite-500">{c.clientId ? "Meu catalogo" : "Padrao OptiProcess"}</span>
            ),
          },
          {
            header: "Status",
            accessor: (c) =>
              canEdit(c) ? (
                <button onClick={() => toggleActive(c)} className="cursor-pointer">
                  <StatusBadge status={c.active ? "ACTIVE" : "INACTIVE"} />
                </button>
              ) : (
                <StatusBadge status={c.active ? "ACTIVE" : "INACTIVE"} />
              ),
          },
          {
            header: "",
            accessor: (c) =>
              canEdit(c) && (
                <button onClick={() => handleDelete(c)} className="text-graphite-400 hover:text-safety-red" aria-label="Remover codigo">
                  <Trash2 className="h-4 w-4" />
                </button>
              ),
          },
        ]}
      />

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Novo codigo de falha"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setCreateOpen(false)}>Cancelar</button>
            <button type="submit" form="failure-code-form" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </button>
          </>
        }
      >
        <form id="failure-code-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <TextInput label="Codigo" required placeholder="Ex.: FC-001" error={errors.code?.message} {...register("code")} />
          <TextInput label="Descricao" required error={errors.description?.message} {...register("description")} />
          <TextInput label="Categoria (opcional)" placeholder="Ex.: Eletrica, Mecanica" {...register("category")} />
        </form>
      </Modal>
    </div>
  );
}
