import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Modal } from "../../../components/Modal";
import { TextInput, SelectInput } from "../../../components/form/Field";
import { ClientPicker } from "../../../components/ClientPicker";
import { AssetTypeInput } from "../../../components/AssetTypeInput";
import { InstrumentPicker } from "../../../components/InstrumentPicker";
import { LocationPicker } from "../../../components/LocationPicker";
import { createInstrument, updateInstrument } from "../../../api/instruments";
import type { Instrument } from "../../../api/types";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";

const schema = z.object({
  clientId: z.string().uuid("Selecione o cliente."),
  tag: z.string().min(1, "Informe o TAG do ativo."),
  description: z.string().optional(),
  type: z.string().min(2, "Informe o tipo (Planta, Linha, Maquina, Componente...)."),
  criticality: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  operationalStatus: z.enum(["IN_OPERATION", "STOPPED", "STANDBY", "DEACTIVATED", "IN_MAINTENANCE"]).optional(),
  parentId: z.string().uuid().optional().or(z.literal("")),
  installationLocation: z.string().optional(),
  costCenterId: z.string().uuid().optional().or(z.literal("")),
  // Ficha do fabricante - opcional, fica recolhida.
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  // Calibracao - so para quem rastreia calibracao periodica deste ativo.
  measurementRange: z.string().optional(),
  resolution: z.string().optional(),
  unit: z.string().optional(),
  calibrationFrequencyMonths: z.coerce.number().int().min(1).optional().or(z.literal("")),
  lastCalibrationDate: z.string().optional(),
  status: z.enum(["VALID", "DUE_SOON", "EXPIRED", "IN_MAINTENANCE"]).optional(),
  // Classificacao antiga por catalogos - mantida para quem ja usa, escondida por padrao.
  plantId: z.string().uuid().optional().or(z.literal("")),
  areaId: z.string().uuid().optional().or(z.literal("")),
  systemId: z.string().uuid().optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (instrument: Instrument) => void;
  instrument?: Instrument;
  /** Pre-preenche o ativo pai e o cliente quando aberto a partir de "Adicionar filho" na ficha do pai. */
  initialParentId?: string;
  initialClientId?: string;
  /** Sugestao de TAG (ex.: "F01-RMP-") a partir do TAG do pai - so um valor inicial, o campo continua livre pra editar/apagar. */
  initialTagPrefix?: string;
  /** Tipo sugerido para o filho (ex.: pai e' Linha -> sugere Maquina). */
  initialType?: string;
}

/** Secao recolhivel - o que nao e' essencial no cadastro fica fora do caminho. */
function Section({ title, hint, children, defaultOpen = false }: { title: string; hint?: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-gray-200">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-graphite-700 hover:bg-gray-50"
      >
        {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        {title}
        {hint && <span className="ml-auto text-xs font-normal text-graphite-400">{hint}</span>}
      </button>
      {open && <div className="space-y-4 border-t border-gray-100 p-4">{children}</div>}
    </div>
  );
}

export function InstrumentFormModal({ open, onClose, onSaved, instrument, initialParentId, initialClientId, initialTagPrefix, initialType }: Props) {
  const { notify } = useToast();
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });
  const clientId = watch("clientId");
  const tracksCalibration = !!watch("calibrationFrequencyMonths");

  useEffect(() => {
    if (open) {
      reset(
        instrument
          ? {
              clientId: instrument.clientId,
              tag: instrument.tag ?? "",
              description: instrument.description ?? "",
              type: instrument.type,
              criticality: instrument.criticality,
              operationalStatus: instrument.operationalStatus,
              parentId: instrument.parentId ?? "",
              installationLocation: instrument.installationLocation ?? "",
              costCenterId: instrument.costCenterId ?? "",
              manufacturer: instrument.manufacturer ?? "",
              model: instrument.model ?? "",
              serialNumber: instrument.serialNumber ?? "",
              measurementRange: instrument.measurementRange ?? "",
              resolution: instrument.resolution ?? "",
              unit: instrument.unit ?? "",
              calibrationFrequencyMonths: instrument.calibrationFrequencyMonths ?? undefined,
              lastCalibrationDate: instrument.lastCalibrationDate?.slice(0, 10) ?? "",
              status: instrument.status,
              plantId: instrument.plantId ?? "",
              areaId: instrument.areaId ?? "",
              systemId: instrument.systemId ?? "",
            }
          : {
              criticality: "MEDIUM",
              operationalStatus: "IN_OPERATION",
              parentId: initialParentId ?? "",
              clientId: initialClientId ?? "",
              tag: initialTagPrefix ?? "",
              type: initialType ?? "",
            },
      );
    }
  }, [open, instrument, initialParentId, initialClientId, initialTagPrefix, initialType, reset]);

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
        systemId: values.systemId || null,
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
    <Modal open={open} onClose={onClose} title={instrument ? "Editar ativo" : "Novo ativo"} size="lg" footer={
      <>
        <button type="button" className="btn-outline" onClick={onClose}>Cancelar</button>
        <button type="submit" form="instrument-form" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar"}
        </button>
      </>
    }>
      <form id="instrument-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <ClientPicker required error={errors.clientId?.message} {...register("clientId")} />

        {/* O essencial: como este ativo se chama e onde ele entra na arvore. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="TAG"
            required
            placeholder="Ex.: VTP-VOT-L4-CP01"
            hint="Codigo unico do ativo dentro da empresa."
            error={errors.tag?.message}
            {...register("tag")}
          />
          <TextInput
            label="Descricao"
            placeholder="Ex.: Compressor de ar da Linha 4"
            hint="Nome do ativo em linguagem de gente."
            error={errors.description?.message}
            {...register("description")}
          />
        </div>

        <InstrumentPicker
          label="Faz parte de (ativo pai)"
          hint="A estrutura e' uma arvore: Planta > Linha > Maquina > Componente. Deixe vazio se este ativo esta no topo (ex.: uma planta)."
          clientId={clientId}
          excludeId={instrument?.id}
          error={errors.parentId?.message}
          {...register("parentId")}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <AssetTypeInput required currentValue={instrument?.type} error={errors.type?.message} {...register("type")} />
          <SelectInput
            label="Criticidade"
            hint="Quanto uma parada pesa pra empresa."
            options={[
              { value: "LOW", label: "Baixa" },
              { value: "MEDIUM", label: "Media" },
              { value: "HIGH", label: "Alta" },
              { value: "CRITICAL", label: "Critica" },
            ]}
            {...register("criticality")}
          />
          <SelectInput
            label="Condicao"
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

        <Section title="Ficha do fabricante" hint="opcional">
          <div className="grid gap-4 sm:grid-cols-3">
            <TextInput label="Fabricante" {...register("manufacturer")} />
            <TextInput label="Modelo" {...register("model")} />
            <TextInput label="Numero de serie" {...register("serialNumber")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Ponto de instalacao" placeholder="Ex.: Casa de maquinas, painel 3" {...register("installationLocation")} />
            <LocationPicker clientId={clientId} register={register} watch={watch} setValue={setValue} onlyCostCenter />
          </div>
        </Section>

        <Section title="Calibracao" hint="so para ativos com calibracao periodica">
          <div className="grid gap-4 sm:grid-cols-3">
            <TextInput
              label="Periodicidade (meses)"
              type="number"
              hint="Em branco = este ativo nao tem calibracao rastreada."
              error={errors.calibrationFrequencyMonths?.message}
              {...register("calibrationFrequencyMonths")}
            />
            <TextInput label="Ultima calibracao" type="date" {...register("lastCalibrationDate")} />
            {instrument && tracksCalibration && (
              <SelectInput
                label="Status do certificado"
                options={[
                  { value: "VALID", label: "Valido" },
                  { value: "DUE_SOON", label: "Proximo do vencimento" },
                  { value: "EXPIRED", label: "Vencido" },
                  { value: "IN_MAINTENANCE", label: "Em manutencao" },
                ]}
                {...register("status")}
              />
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <TextInput label="Faixa de medicao" {...register("measurementRange")} />
            <TextInput label="Resolucao" {...register("resolution")} />
            <TextInput label="Unidade" {...register("unit")} />
          </div>
        </Section>

        <Section title="Classificacao por catalogo (Planta/Area/Sistema)" hint="opcional - a arvore ja diz onde o ativo esta">
          <p className="text-xs text-graphite-500">
            So preencha se voce usa esses catalogos para filtrar relatorios. Quem monta a estrutura pela arvore
            (campo "Faz parte de") nao precisa repetir a informacao aqui.
          </p>
          <LocationPicker clientId={clientId} register={register} watch={watch} setValue={setValue} hideCostCenter />
        </Section>
      </form>
    </Modal>
  );
}
