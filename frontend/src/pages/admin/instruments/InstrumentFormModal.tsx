import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Modal } from "../../../components/Modal";
import { TextInput, SelectInput, CheckboxInput } from "../../../components/form/Field";
import { ClientPicker } from "../../../components/ClientPicker";
import { AssetTypeInput } from "../../../components/AssetTypeInput";
import { InstrumentPicker } from "../../../components/InstrumentPicker";
import { LocationPicker } from "../../../components/LocationPicker";
import { createInstrument, updateInstrument, getInstrument } from "../../../api/instruments";
import { listAssetTypes } from "../../../api/assetTypes";
import type { Instrument } from "../../../api/types";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../../auth/AuthContext";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";

const schema = z.object({
  clientId: z.string().uuid("Selecione o cliente."),
  tag: z.string().min(1, "Informe o TAG do ativo."),
  description: z.string().min(2, "Informe a descricao do ativo."),
  type: z.string().min(2, "Informe o tipo (Planta, Linha, Maquina, Componente...)."),
  criticality: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  operationalStatus: z.enum(["IN_OPERATION", "STOPPED", "STANDBY", "DEACTIVATED", "IN_MAINTENANCE"]).optional(),
  parentId: z.string().uuid().optional().or(z.literal("")),
  installationLocation: z.string().optional(),
  calibratable: z.boolean().optional(),
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
  // Contexto so e' escolhido no ativo raiz (a planta). Nos filhos vem herdado do pai.
  plantId: z.string().uuid().optional().or(z.literal("")),
  areaId: z.string().uuid().optional().or(z.literal("")),
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
  const { user } = useAuth();
  const clientId = watch("clientId");
  const parentId = watch("parentId");
  const selectedType = watch("type");
  const tracksCalibration = !!watch("calibrationFrequencyMonths");

  // Nivel do tipo escolhido decide o que e' obrigatorio (requisito 5) e se o ativo pode
  // ficar na raiz da arvore (requisito 6).
  const { data: assetTypes } = useQuery({
    queryKey: ["asset-types-picker"],
    queryFn: () => listAssetTypes({ active: true }),
    staleTime: 60_000,
  });
  const level = (assetTypes ?? []).find((t) => t.name.toLowerCase() === (selectedType ?? "").toLowerCase())?.level ?? null;
  const isRoot = level === "PLANT";
  const exigeFichaTecnica = level === "MACHINE";

  // Contexto herdado do pai - so leitura, o filho nao redefine planta/area/centro de custo.
  const { data: parent } = useQuery({
    queryKey: ["instrument-parent-context", parentId],
    queryFn: () => getInstrument(parentId as string),
    enabled: !!parentId,
  });

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
              calibratable: instrument.calibratable,
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
          required={!isRoot}
          hint={
            isRoot
              ? "Planta e' a raiz da arvore - nao precisa de pai."
              : "Estrutura: Planta > Area > Ativo/Sistema > Equipamento > Componente."
          }
          clientId={clientId}
          excludeId={instrument?.id}
          error={errors.parentId?.message}
          {...register("parentId")}
        />

        {parentId && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-graphite-400">Contexto herdado</p>
            <p className="mt-0.5 text-xs text-graphite-500">
              Vem do ativo pai e do centro de custo padrao da area - nao se edita aqui.
            </p>
            <dl className="mt-2 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-graphite-400">Planta</dt>
                <dd className="font-medium text-graphite-800">{parent?.plant?.name ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-xs text-graphite-400">Area</dt>
                <dd className="font-medium text-graphite-800">{parent?.area?.name ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-xs text-graphite-400">Centro de custo</dt>
                <dd className="font-medium text-graphite-800">{parent?.costCenter?.name ?? "-"}</dd>
              </div>
            </dl>
          </div>
        )}

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

        <Section
          title="Ficha do fabricante"
          hint={exigeFichaTecnica ? "obrigatoria para este tipo" : "opcional"}
          defaultOpen={exigeFichaTecnica}
        >
          {exigeFichaTecnica && (
            <p className="text-xs text-graphite-500">
              Equipamento/maquina tem ficha de fabricante rastreavel - por isso os tres campos abaixo sao exigidos
              neste tipo de ativo. Em area, linha, sistema ou componente eles ficam opcionais.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <TextInput label="Fabricante" required={exigeFichaTecnica} {...register("manufacturer")} />
            <TextInput label="Modelo" required={exigeFichaTecnica} {...register("model")} />
            <TextInput label="Numero de serie" required={exigeFichaTecnica} {...register("serialNumber")} />
          </div>
          <TextInput label="Ponto de instalacao" placeholder="Ex.: Casa de maquinas, painel 3" {...register("installationLocation")} />
        </Section>

        <Section title="Calibracao" hint="so para ativos com calibracao periodica">
          <CheckboxInput
            label="Ativo calibravel - aparece na lista de Ativos da OptiProcess"
            {...register("calibratable")}
          />
          <p className="text-xs text-graphite-500">
            Marque so equipamentos que passam por calibracao. Linha, area, maquina e componente do CMMS
            ficam desmarcados e nao aparecem para a equipe da OptiProcess.
          </p>
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

        {!parentId && (
          <Section title="Localizacao (planta e area)" hint="definida no ativo raiz" defaultOpen>
            <p className="text-xs text-graphite-500">
              Como este ativo nao tem pai, e' aqui que a planta e a area sao definidas. Todos os ativos abaixo
              dele na arvore herdam esse contexto automaticamente.
            </p>
            <LocationPicker clientId={clientId} register={register} watch={watch} setValue={setValue} hideCostCenter />
          </Section>
        )}

        {user?.role === "ADMIN" && (
          <Section title="Excecao de centro de custo" hint="somente administrador">
            <p className="text-xs text-graphite-500">
              Por padrao o centro de custo vem da area. Preencha aqui apenas se este ativo especifico precisa
              ser rateado em outro centro de custo - a heranca deixa de sobrescrever este ativo.
            </p>
            <LocationPicker clientId={clientId} register={register} watch={watch} setValue={setValue} onlyCostCenter />
          </Section>
        )}
      </form>
    </Modal>
  );
}
