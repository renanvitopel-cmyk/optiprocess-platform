import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { listFailureCodes, createFailureCode, updateFailureCode } from "../../../api/failureCodes";
import type { FailureCode } from "../../../api/types";
import { PageHeader } from "../../../components/PageHeader";
import { DataTable } from "../../../components/DataTable";
import { StatusBadge } from "../../../components/StatusBadge";
import { Modal } from "../../../components/Modal";
import { TextInput } from "../../../components/form/Field";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";
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
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["failure-codes"], queryFn: () => listFailureCodes() });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

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
    try {
      await updateFailureCode(code.id, { active: !code.active });
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
        breadcrumbs={[{ label: "RLP Maintenance CMMS", to: "/gestao/manutencao" }, { label: "Codigos de falha" }]}
        actions={
          <button className="btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Novo codigo
          </button>
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
            header: "Status",
            accessor: (c) => (
              <button onClick={() => toggleActive(c)} className="cursor-pointer">
                <StatusBadge status={c.active ? "ACTIVE" : "INACTIVE"} />
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
