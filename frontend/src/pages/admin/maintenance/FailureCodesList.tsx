import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { listFailureCodes, createFailureCode, updateFailureCode, deleteFailureCode } from "../../../api/failureCodes";
import type { FailureCode } from "../../../api/types";
import { PageHeader } from "../../../components/PageHeader";
import { DataTable } from "../../../components/DataTable";
import { StatusBadge } from "../../../components/StatusBadge";
import { Modal } from "../../../components/Modal";
import { TextInput, TextareaInput, SelectInput } from "../../../components/form/Field";
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
  symptom: z.string().optional(),
  mode: z.string().optional(),
  mechanism: z.string().optional(),
  cause: z.string().optional(),
  correctiveAction: z.string().optional(),
  applicableAssetFamily: z.string().optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

/** Catalogo de falhas com a taxonomia completa (sintoma/modo/mecanismo/causa/acao
 * corretiva) - codigo+descricao continuam bastando pro uso basico, o resto e' pra quem
 * quer registrar a analise em mais detalhe. */
export default function FailureCodesList() {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const { canManage, isClient, ownClientId, base } = useCmms();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<FailureCode | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["failure-codes"], queryFn: () => listFailureCodes() });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  // Codigos sem clientId sao o catalogo padrao da OptiProcess: o cliente usa, mas nao edita.
  function canEdit(code: FailureCode) {
    if (!canManage) return false;
    return isClient ? code.clientId === ownClientId : true;
  }

  function openCreate() {
    reset({ code: "", description: "", category: "", symptom: "", mode: "", mechanism: "", cause: "", correctiveAction: "", applicableAssetFamily: "", severity: "" });
    setEditing(null);
    setCreateOpen(true);
  }

  function openEdit(code: FailureCode) {
    reset({
      code: code.code,
      description: code.description,
      category: code.category ?? "",
      symptom: code.symptom ?? "",
      mode: code.mode ?? "",
      mechanism: code.mechanism ?? "",
      cause: code.cause ?? "",
      correctiveAction: code.correctiveAction ?? "",
      applicableAssetFamily: code.applicableAssetFamily ?? "",
      severity: code.severity ?? "",
    });
    setEditing(code);
    setCreateOpen(true);
  }

  async function onSubmit(values: FormValues) {
    const payload = { ...values, severity: values.severity || null };
    try {
      if (editing) {
        await updateFailureCode(editing.id, payload);
        notify("success", "Codigo de falha atualizado.");
      } else {
        await createFailureCode(payload);
        notify("success", "Codigo de falha criado.");
      }
      reset();
      setCreateOpen(false);
      setEditing(null);
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
            <button className="btn-primary" onClick={openCreate}>
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
          { header: "Mecanismo", accessor: (c) => c.mechanism ?? "-" },
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
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(c)} className="text-graphite-400 hover:text-navy-700" aria-label="Editar codigo">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(c)} className="text-graphite-400 hover:text-safety-red" aria-label="Remover codigo">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ),
          },
        ]}
      />

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={editing ? "Editar codigo de falha" : "Novo codigo de falha"}
        size="lg"
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
          <div className="grid gap-4 sm:grid-cols-3">
            <TextInput label="Codigo" required placeholder="Ex.: FC-001" error={errors.code?.message} {...register("code")} />
            <TextInput label="Categoria (opcional)" placeholder="Ex.: Eletrica, Mecanica" {...register("category")} />
            <SelectInput
              label="Severidade (opcional)"
              placeholder="Nao definida"
              options={[
                { value: "LOW", label: "Baixa" },
                { value: "MEDIUM", label: "Media" },
                { value: "HIGH", label: "Alta" },
                { value: "CRITICAL", label: "Critica" },
              ]}
              {...register("severity")}
            />
          </div>
          <TextInput label="Descricao" required error={errors.description?.message} {...register("description")} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Sintoma (opcional)" placeholder="O que se observa" {...register("symptom")} />
            <TextInput label="Modo de falha (opcional)" placeholder="Como a falha se manifesta" {...register("mode")} />
            <TextInput label="Mecanismo (opcional)" placeholder="Ex.: corrosao, fadiga, desgaste" {...register("mechanism")} />
            <TextInput label="Causa (opcional)" placeholder="Raiz apontada" {...register("cause")} />
          </div>
          <TextareaInput label="Acao corretiva padrao (opcional)" rows={2} {...register("correctiveAction")} />
          <TextInput label="Familia de ativo aplicavel (opcional)" placeholder="Ex.: Motores eletricos, Bombas centrifugas" {...register("applicableAssetFamily")} />
        </form>
      </Modal>
    </div>
  );
}
