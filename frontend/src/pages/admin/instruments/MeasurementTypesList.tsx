import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  listMeasurementTypes,
  createMeasurementType,
  updateMeasurementType,
  deleteMeasurementType,
} from "../../../api/measurementTypes";
import type { MeasurementType, MeasurementFieldProfile } from "../../../api/types";
import { PageHeader } from "../../../components/PageHeader";
import { DataTable } from "../../../components/DataTable";
import { StatusBadge } from "../../../components/StatusBadge";
import { Modal } from "../../../components/Modal";
import { TextInput, SelectInput } from "../../../components/form/Field";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const FIELD_PROFILE_LABELS: Record<MeasurementFieldProfile, string> = {
  GENERIC: "Generico (so faixa e unidade)",
  TEMPERATURE: "Temperatura (alvo + % tolerancia)",
  SCALE: "Balanca (zero + span)",
};

const schema = z.object({
  name: z.string().min(2, "Informe o nome da grandeza."),
  defaultUnit: z.string().optional(),
  fieldProfile: z.enum(["GENERIC", "TEMPERATURE", "SCALE"]),
});
type FormValues = z.infer<typeof schema>;

/** Catalogo tecnico interno: quais grandezas existem (Temperatura, Balanca/Peso...) e
 * quais campos extras cada uma pede no ponto de calibracao. So' a equipe da OptiProcess
 * cadastra/edita - o cliente so' escolhe entre o que ja existe ao criar um ponto. */
export default function MeasurementTypesList() {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingType, setEditingType] = useState<MeasurementType | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["measurement-types"], queryFn: () => listMeasurementTypes() });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  function openCreate() {
    reset({ name: "", defaultUnit: "", fieldProfile: "GENERIC" });
    setEditingType(null);
    setCreateOpen(true);
  }

  function openEdit(type: MeasurementType) {
    reset({ name: type.name, defaultUnit: type.defaultUnit ?? "", fieldProfile: type.fieldProfile });
    setEditingType(type);
    setCreateOpen(true);
  }

  async function onSubmit(values: FormValues) {
    const payload = { name: values.name, defaultUnit: values.defaultUnit || null, fieldProfile: values.fieldProfile };
    try {
      if (editingType) {
        await updateMeasurementType(editingType.id, payload);
        notify("success", "Grandeza atualizada.");
      } else {
        await createMeasurementType(payload);
        notify("success", "Grandeza criada.");
      }
      setCreateOpen(false);
      setEditingType(null);
      queryClient.invalidateQueries({ queryKey: ["measurement-types"] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function toggleActive(type: MeasurementType) {
    try {
      await updateMeasurementType(type.id, { active: !type.active });
      queryClient.invalidateQueries({ queryKey: ["measurement-types"] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function handleDelete(type: MeasurementType) {
    try {
      await deleteMeasurementType(type.id);
      notify("success", "Grandeza removida.");
      queryClient.invalidateQueries({ queryKey: ["measurement-types"] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  return (
    <div>
      <PageHeader
        title="Tipos de grandeza"
        description="Grandezas calibradas (temperatura, balanca...) e os campos que cada uma pede no ponto de calibracao"
        breadcrumbs={[
          { label: "Ativos", to: "/gestao/instrumentos" },
          { label: "Cadastros tecnicos", to: "/gestao/instrumentos/cadastros" },
          { label: "Tipos de grandeza" },
        ]}
        actions={
          <button className="btn-primary" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nova grandeza
          </button>
        }
      />

      <DataTable
        loading={isLoading}
        rows={data ?? []}
        keyField={(t) => t.id}
        emptyTitle="Nenhuma grandeza cadastrada"
        columns={[
          { header: "Nome", accessor: (t) => <span className="font-medium text-navy-900">{t.name}</span> },
          { header: "Unidade padrao", accessor: (t) => t.defaultUnit ?? "-" },
          { header: "Campos extras", accessor: (t) => <span className="text-xs text-graphite-500">{FIELD_PROFILE_LABELS[t.fieldProfile]}</span> },
          {
            header: "Status",
            accessor: (t) => (
              <button onClick={() => toggleActive(t)} className="cursor-pointer">
                <StatusBadge status={t.active ? "ACTIVE" : "INACTIVE"} />
              </button>
            ),
          },
          {
            header: "",
            accessor: (t) => (
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(t)} className="text-graphite-400 hover:text-navy-700" aria-label="Editar grandeza">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(t)} className="text-graphite-400 hover:text-safety-red" aria-label="Remover grandeza">
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
        title={editingType ? "Editar tipo de grandeza" : "Novo tipo de grandeza"}
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setCreateOpen(false)}>Cancelar</button>
            <button type="submit" form="measurement-type-form" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </button>
          </>
        }
      >
        <form id="measurement-type-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <TextInput label="Nome" required placeholder="Ex.: Temperatura, Balanca, Pressao" error={errors.name?.message} {...register("name")} />
          <TextInput label="Unidade padrao" placeholder="Ex.: °C, kg, bar" hint="Preenche o campo unidade do ponto automaticamente - continua editavel." {...register("defaultUnit")} />
          <SelectInput
            label="Campos extras no ponto de calibracao"
            options={[
              { value: "GENERIC", label: FIELD_PROFILE_LABELS.GENERIC },
              { value: "TEMPERATURE", label: FIELD_PROFILE_LABELS.TEMPERATURE },
              { value: "SCALE", label: FIELD_PROFILE_LABELS.SCALE },
            ]}
            error={errors.fieldProfile?.message}
            {...register("fieldProfile")}
          />
        </form>
      </Modal>
    </div>
  );
}
