import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "../../components/Modal";
import { TextInput, SelectInput } from "../../components/form/Field";
import { InstrumentPicker } from "../../components/InstrumentPicker";
import { AssetTypeInput } from "../../components/AssetTypeInput";
import { LocationPicker } from "../../components/LocationPicker";
import { createInstrument, updateInstrument, getInstrument } from "../../api/instruments";
import type { Instrument } from "../../api/types";
import { useToast } from "../../components/Toast";
import { getApiErrorMessage } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";

const schema = z.object({
  type: z.string().min(2, "Informe o tipo de equipamento."),
  tag: z.string().min(1, "Informe o TAG do ativo."),
  description: z.string().min(2, "Informe a descricao do ativo."),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  installationLocation: z.string().optional(),
  calibrationFrequencyMonths: z.coerce.number().int().min(1).optional().or(z.literal("")),
  criticality: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  operationalStatus: z.enum(["IN_OPERATION", "STOPPED", "STANDBY", "DEACTIVATED", "IN_MAINTENANCE"]).optional(),
  parentId: z.string().uuid().optional().or(z.literal("")),
  plantId: z.string().uuid().optional().or(z.literal("")),
  areaId: z.string().uuid().optional().or(z.literal("")),
  costCenterId: z.string().uuid().optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (instrument: Instrument) => void;
  instrument?: Instrument;
  /** Pre-preenche o ativo pai quando aberto pelo "Adicionar componente" da ficha do pai. */
  initialParentId?: string;
  /** Sugestao de TAG (ex.: "F01-RMP-") a partir do TAG do pai - so um valor inicial, o campo continua livre pra editar/apagar. */
  initialTagPrefix?: string;
}

/** Cadastro de ativo pelo proprio cliente no portal - sem escolha de empresa (o backend
 * sempre grava para a empresa do usuario logado) e so com os campos essenciais. */
export function PortalInstrumentFormModal({ open, onClose, onSaved, instrument, initialParentId, initialTagPrefix }: Props) {
  const { notify } = useToast();
  const { user } = useAuth();
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  // O pai escolhido define o contexto herdado mostrado acima.
  const parentId = watch("parentId");
  const { data: pai } = useQuery({
    queryKey: ["instrument-parent-context", parentId],
    queryFn: () => getInstrument(parentId as string),
    enabled: !!parentId,
  });

  useEffect(() => {
    if (open) {
      reset(
        instrument
          ? {
              type: instrument.type,
              tag: instrument.tag ?? "",
              description: instrument.description ?? "",
              manufacturer: instrument.manufacturer ?? "",
              model: instrument.model ?? "",
              serialNumber: instrument.serialNumber ?? "",
              installationLocation: instrument.installationLocation ?? "",
              calibrationFrequencyMonths: instrument.calibrationFrequencyMonths ?? undefined,
              criticality: instrument.criticality,
              operationalStatus: instrument.operationalStatus,
              parentId: instrument.parentId ?? "",
              plantId: instrument.plantId ?? "",
              areaId: instrument.areaId ?? "",
              costCenterId: instrument.costCenterId ?? "",
            }
          : { criticality: "MEDIUM", operationalStatus: "IN_OPERATION", parentId: initialParentId ?? "", tag: initialTagPrefix ?? "" },
      );
    }
  }, [open, instrument, initialParentId, initialTagPrefix, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const payload = {
        ...values,
        description: values.description || null,
        manufacturer: values.manufacturer || null,
        model: values.model || null,
        serialNumber: values.serialNumber || null,
        parentId: values.parentId || null,
        plantId: values.plantId || null,
        areaId: values.areaId || null,
        costCenterId: values.costCenterId || null,
        calibrationFrequencyMonths: values.calibrationFrequencyMonths || null,
      };
      const saved = instrument ? await updateInstrument(instrument.id, payload) : await createInstrument(payload);
      notify("success", instrument ? "Ativo atualizado." : "Ativo cadastrado.");
      onSaved(saved);
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={instrument ? "Editar ativo" : "Novo ativo"}
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose}>Cancelar</button>
          <button type="submit" form="portal-instrument-form" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar"}
          </button>
        </>
      }
    >
      <form id="portal-instrument-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="TAG"
            required
            placeholder="Ex.: VTP-VOT-L4-CP01"
            hint="Codigo unico deste ativo na sua empresa."
            error={errors.tag?.message}
            {...register("tag")}
          />
          <TextInput
            label="Descricao"
            placeholder="Ex.: Compressor de ar da Linha 4"
            hint="Nome do ativo em linguagem de gente."
            {...register("description")}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <AssetTypeInput required currentValue={instrument?.type} error={errors.type?.message} {...register("type")} />
          <SelectInput
            label="Criticidade"
            hint="Quanto uma parada deste ativo pesa pra sua operacao."
            options={[
              { value: "LOW", label: "Baixa" },
              { value: "MEDIUM", label: "Media" },
              { value: "HIGH", label: "Alta" },
              { value: "CRITICAL", label: "Critica" },
            ]}
            {...register("criticality")}
          />
          <SelectInput
            label="Condicao operacional"
            hint="O que esta acontecendo com o ativo agora."
            options={[
              { value: "IN_OPERATION", label: "Em operacao" },
              { value: "STOPPED", label: "Parado" },
              { value: "STANDBY", label: "Reserva" },
              { value: "DEACTIVATED", label: "Desativado" },
              { value: "IN_MAINTENANCE", label: "Em manutencao" },
            ]}
            {...register("operationalStatus")}
          />
        </div>
        <InstrumentPicker
          label="Faz parte de (ativo pai)"
          hint="A estrutura e' uma arvore: Planta > Linha > Maquina > Componente. Vazio = ativo no topo."
          excludeId={instrument?.id}
          error={errors.parentId?.message}
          {...register("parentId")}
        />
        {/* Planta, area e centro de custo sao definidos uma vez no ativo raiz e herdados por
            todo o galho abaixo. Num ativo filho eles nao se editam - antes o formulario
            pedia esses campos e o backend os descartava em seguida, substituindo pelo
            contexto do pai: o usuario preenchia e nao entendia por que mudava sozinho. */}
        {parentId ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-graphite-400">Contexto herdado</p>
            <p className="mt-0.5 text-xs text-graphite-500">Vem do ativo pai - a arvore e' a verdade tecnica.</p>
            <dl className="mt-2 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-graphite-400">Planta</dt>
                <dd className="font-medium text-graphite-800">{pai?.plant?.name ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-xs text-graphite-400">Area</dt>
                <dd className="font-medium text-graphite-800">{pai?.area?.name ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-xs text-graphite-400">Centro de custo</dt>
                <dd className="font-medium text-graphite-800">{pai?.costCenter?.name ?? "-"}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-sm font-medium text-graphite-700">Onde fica</p>
            <p className="mt-0.5 text-xs text-graphite-500">
              Como este ativo nao tem pai, e' aqui que planta e area sao definidas - todo ativo abaixo dele herda.
            </p>
            <div className="mt-3">
              <LocationPicker clientId={user?.clientId ?? undefined} register={register} watch={watch} setValue={setValue} />
            </div>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <TextInput label="Fabricante" required error={errors.manufacturer?.message} {...register("manufacturer")} />
          <TextInput label="Modelo" required error={errors.model?.message} {...register("model")} />
          <TextInput label="Numero de serie" required error={errors.serialNumber?.message} {...register("serialNumber")} />
        </div>
        <TextInput label="Local de instalacao" {...register("installationLocation")} />
        <TextInput
          label="Periodicidade de calibracao (meses)"
          type="number"
          hint="Deixe em branco se este ativo nao precisa de calibracao periodica."
          error={errors.calibrationFrequencyMonths?.message}
          {...register("calibrationFrequencyMonths")}
        />
      </form>
    </Modal>
  );
}
