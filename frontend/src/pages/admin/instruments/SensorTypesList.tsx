import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { listSensorTypes, createSensorType, updateSensorType, deleteSensorType } from "../../../api/sensorTypes";
import { listMeasurementTypes } from "../../../api/measurementTypes";
import type { SensorType } from "../../../api/types";
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

const schema = z.object({
  measurementTypeId: z.string().uuid("Selecione a grandeza."),
  name: z.string().min(1, "Informe o nome do tipo de sensor."),
});
type FormValues = z.infer<typeof schema>;

/** Tecnologia do sensor dentro de uma grandeza (ex.: PT100, Termopar tipo K, dentro de
 * Temperatura) - usado no cadastro do ponto de calibracao para o certificado descrever
 * corretamente o principio de medicao. So' a equipe da OptiProcess mantem este catalogo. */
export default function SensorTypesList() {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [filtroGrandeza, setFiltroGrandeza] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingType, setEditingType] = useState<SensorType | null>(null);

  const { data: measurementTypes } = useQuery({ queryKey: ["measurement-types"], queryFn: () => listMeasurementTypes() });
  const { data, isLoading } = useQuery({
    queryKey: ["sensor-types", filtroGrandeza],
    queryFn: () => listSensorTypes({ measurementTypeId: filtroGrandeza || undefined }),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (createOpen && !editingType && filtroGrandeza) reset({ measurementTypeId: filtroGrandeza, name: "" });
  }, [createOpen, editingType, filtroGrandeza, reset]);

  function openCreate() {
    reset({ measurementTypeId: filtroGrandeza || "", name: "" });
    setEditingType(null);
    setCreateOpen(true);
  }

  function openEdit(type: SensorType) {
    reset({ measurementTypeId: type.measurementTypeId, name: type.name });
    setEditingType(type);
    setCreateOpen(true);
  }

  async function onSubmit(values: FormValues) {
    try {
      if (editingType) {
        await updateSensorType(editingType.id, { name: values.name });
        notify("success", "Tipo de sensor atualizado.");
      } else {
        await createSensorType(values);
        notify("success", "Tipo de sensor criado.");
      }
      setCreateOpen(false);
      setEditingType(null);
      queryClient.invalidateQueries({ queryKey: ["sensor-types"] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function toggleActive(type: SensorType) {
    try {
      await updateSensorType(type.id, { active: !type.active });
      queryClient.invalidateQueries({ queryKey: ["sensor-types"] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function handleDelete(type: SensorType) {
    try {
      await deleteSensorType(type.id);
      notify("success", "Tipo de sensor removido.");
      queryClient.invalidateQueries({ queryKey: ["sensor-types"] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  const grandezaNome = (id: string) => measurementTypes?.find((t) => t.id === id)?.name ?? "-";

  return (
    <div>
      <PageHeader
        title="Tipos de sensor"
        description="Tecnologia do sensor dentro de cada grandeza (ex.: PT100, Termopar tipo K, dentro de Temperatura)"
        breadcrumbs={[
          { label: "Ativos", to: "/gestao/instrumentos" },
          { label: "Cadastros tecnicos", to: "/gestao/instrumentos/cadastros" },
          { label: "Tipos de sensor" },
        ]}
        actions={
          <button className="btn-primary" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Novo tipo de sensor
          </button>
        }
      />

      <div className="mb-4">
        <select className="input sm:w-72" value={filtroGrandeza} onChange={(e) => setFiltroGrandeza(e.target.value)}>
          <option value="">Todas as grandezas</option>
          {(measurementTypes ?? []).map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <DataTable
        loading={isLoading}
        rows={data ?? []}
        keyField={(t) => t.id}
        emptyTitle="Nenhum tipo de sensor cadastrado"
        columns={[
          { header: "Nome", accessor: (t) => <span className="font-medium text-navy-900">{t.name}</span> },
          { header: "Grandeza", accessor: (t) => grandezaNome(t.measurementTypeId) },
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
                <button onClick={() => openEdit(t)} className="text-graphite-400 hover:text-navy-700" aria-label="Editar tipo de sensor">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(t)} className="text-graphite-400 hover:text-safety-red" aria-label="Remover tipo de sensor">
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
        title={editingType ? "Editar tipo de sensor" : "Novo tipo de sensor"}
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setCreateOpen(false)}>Cancelar</button>
            <button type="submit" form="sensor-type-form" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </button>
          </>
        }
      >
        <form id="sensor-type-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <SelectInput
            label="Grandeza"
            required
            placeholder="Selecione a grandeza"
            options={(measurementTypes ?? []).map((t) => ({ value: t.id, label: t.name }))}
            disabled={!!editingType}
            error={errors.measurementTypeId?.message}
            {...register("measurementTypeId")}
          />
          <TextInput label="Nome" required placeholder="Ex.: PT100, Termopar tipo K" error={errors.name?.message} {...register("name")} />
        </form>
      </Modal>
    </div>
  );
}
