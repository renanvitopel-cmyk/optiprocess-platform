import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera, X } from "lucide-react";
import { SecaoRecolhivel } from "../../../components/SecaoRecolhivel";
import { Modal } from "../../../components/Modal";
import { TextInput, SelectInput, CheckboxInput } from "../../../components/form/Field";
import { parseDecimal } from "../../../components/form/UncertaintyFields";
import { ClientPicker } from "../../../components/ClientPicker";
import { AssetTypeInput } from "../../../components/AssetTypeInput";
import { createInstrument, updateInstrument, uploadInstrumentPhoto, deleteInstrumentPhoto } from "../../../api/instruments";
import type { Instrument } from "../../../api/types";
import { useAuth } from "../../../auth/AuthContext";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";

// Campo numerico opcional vindo de um <input type="number">: em branco manda "" (nao
// undefined), e z.coerce.number() transformaria isso em 0 - trata "" como ausencia de
// valor primeiro, mesmo padrao ja usado em outros formularios com campo numerico opcional.
const numeroOpcional = z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : v), z.coerce.number().int().min(1).optional());

/** Numero gravado -> texto do campo, com virgula decimal ("0,2"). */
function decimalParaTexto(v: number | null | undefined): string {
  return v == null ? "" : String(v).replace(".", ",");
}

const schema = z.object({
  clientId: z.string().uuid("Selecione o cliente."),
  tag: z.string().min(1, "Informe o TAG do ativo."),
  description: z.string().min(2, "Informe a descricao do ativo."),
  // O cadastro inicial nao pergunta o tipo - ele entra depois, na ficha do ativo.
  type: z.string().optional(),
  installationLocation: z.string().optional(),
  calibratable: z.boolean().optional(),
  // Ficha do fabricante - opcional, fica recolhida.
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  // Calibracao - so para quem rastreia calibracao periodica deste ativo.
  measurementRange: z.string().optional(),
  resolution: z.string().optional(),
  unit: z.string().optional(),
  calibrationFrequencyMonths: numeroOpcional,
  lastCalibrationDate: z.string().optional(),
  status: z.enum(["VALID", "DUE_SOON", "EXPIRED", "IN_MAINTENANCE"]).optional(),
  // Dados para os calculos da calibracao - em texto no formulario (aceitam virgula) e
  // convertidos com parseDecimal ao salvar.
  rangeMin: z.string().optional(),
  rangeMax: z.string().optional(),
  resolutionValue: z.string().optional(),
  accuracyClass: z.string().optional(),
  toleranceMode: z.enum(["", "PERCENT_FULL_SCALE", "PERCENT_READING", "ABSOLUTE"]).optional(),
  toleranceValue: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (instrument: Instrument) => void;
  instrument?: Instrument;
  initialClientId?: string;
}

export function InstrumentFormModal({ open, onClose, onSaved, instrument, initialClientId }: Props) {
  const { notify } = useToast();
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });
  const { user } = useAuth();
  // O status do certificado so faz sentido em ativo que de fato e' calibrado.
  const tracksCalibration = !!watch("calibratable");

  // Cadastro novo e' o caminho rapido: so o que identifica o ativo. A ficha completa
  // (tipo, fabricante, calibracao) aparece ao editar - assim ninguem precisa saber tudo
  // sobre o equipamento para conseguir cadastra-lo.
  const modoRapido = !instrument;

  const [foto, setFoto] = useState<File | null>(null);
  const [fotoRemovida, setFotoRemovida] = useState(false);
  const previewFoto = foto ? URL.createObjectURL(foto) : fotoRemovida ? null : instrument?.photoUrl ?? null;

  useEffect(() => {
    if (open) {
      setFoto(null);
      setFotoRemovida(false);
      reset(
        instrument
          ? {
              clientId: instrument.clientId,
              tag: instrument.tag ?? "",
              description: instrument.description ?? "",
              type: instrument.type,
              installationLocation: instrument.installationLocation ?? "",
              calibratable: instrument.calibratable,
              manufacturer: instrument.manufacturer ?? "",
              model: instrument.model ?? "",
              serialNumber: instrument.serialNumber ?? "",
              measurementRange: instrument.measurementRange ?? "",
              resolution: instrument.resolution ?? "",
              unit: instrument.unit ?? "",
              calibrationFrequencyMonths: instrument.calibrationFrequencyMonths ?? undefined,
              lastCalibrationDate: instrument.lastCalibrationDate?.slice(0, 10) ?? "",
              status: instrument.status,
              rangeMin: decimalParaTexto(instrument.rangeMin),
              rangeMax: decimalParaTexto(instrument.rangeMax),
              resolutionValue: decimalParaTexto(instrument.resolutionValue),
              accuracyClass: instrument.accuracyClass ?? "",
              toleranceMode: instrument.toleranceMode ?? "",
              toleranceValue: decimalParaTexto(instrument.toleranceValue),
            }
          : {
              clientId: initialClientId ?? "",
              tag: "",
            },
      );
    }
  }, [open, instrument, initialClientId, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const payload = {
        ...values,
        description: values.description || null,
        manufacturer: values.manufacturer || null,
        model: values.model || null,
        serialNumber: values.serialNumber || null,
        rangeMin: parseDecimal(values.rangeMin),
        rangeMax: parseDecimal(values.rangeMax),
        resolutionValue: parseDecimal(values.resolutionValue),
        accuracyClass: values.accuracyClass || null,
        toleranceMode: values.toleranceMode || null,
        toleranceValue: parseDecimal(values.toleranceValue),
      };
      let saved = instrument ? await updateInstrument(instrument.id, payload) : await createInstrument(payload);

      // A foto so pode subir depois que o ativo existe - e' ela que da o id do arquivo.
      if (foto) saved = await uploadInstrumentPhoto(saved.id, foto);
      else if (fotoRemovida && instrument?.photoUrl) await deleteInstrumentPhoto(saved.id);

      notify("success", instrument ? "Ativo atualizado." : "Ativo cadastrado. Complete a ficha tecnica quando quiser.");
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

        {/* O essencial: como este ativo se chama. */}
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

        {/* Foto: opcional, mas e' o que faz a lista de ativos deixar de ser uma tabela de
            codigos e virar algo que a equipe reconhece de relance. */}
        <div className="flex items-center gap-4">
          {previewFoto ? (
            <img src={previewFoto} alt="Foto do ativo" className="h-20 w-20 shrink-0 rounded-lg border border-gray-200 object-cover" />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
              <Camera className="h-6 w-6 text-graphite-300" />
            </div>
          )}
          <div className="min-w-0">
            <label className="btn-outline inline-flex cursor-pointer items-center gap-2 text-sm">
              <Camera className="h-4 w-4" />
              {previewFoto ? "Trocar foto" : "Adicionar foto"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const arquivo = e.target.files?.[0] ?? null;
                  setFoto(arquivo);
                  if (arquivo) setFotoRemovida(false);
                }}
              />
            </label>
            {previewFoto && (
              <button
                type="button"
                className="ml-2 inline-flex items-center gap-1 text-xs text-graphite-500 hover:text-safety-red"
                onClick={() => { setFoto(null); setFotoRemovida(true); }}
              >
                <X className="h-3 w-3" /> Remover
              </button>
            )}
            <p className="mt-1 text-xs text-graphite-400">Opcional. Uma foto do equipamento ajuda a reconhecer o ativo na lista.</p>
          </div>
        </div>

        {!modoRapido && (
        <>
        <div className="grid gap-4 sm:grid-cols-3">
          <AssetTypeInput currentValue={instrument?.type} error={errors.type?.message} {...register("type")} />
        </div>

        <SecaoRecolhivel titulo="Ficha do fabricante" dica="opcional">
          <div className="grid gap-4 sm:grid-cols-3">
            <TextInput label="Fabricante" {...register("manufacturer")} />
            <TextInput label="Modelo" {...register("model")} />
            <TextInput label="Numero de serie" {...register("serialNumber")} />
          </div>
          <TextInput label="Ponto de instalacao" placeholder="Ex.: Casa de maquinas, painel 3" {...register("installationLocation")} />
        </SecaoRecolhivel>

        <SecaoRecolhivel titulo="Calibracao" dica="a que este ativo esta sujeito">
          <CheckboxInput
            label="Ativo calibravel - aparece na lista de Ativos da OptiProcess"
            {...register("calibratable")}
          />
          <p className="text-xs text-graphite-500">
            Marque so equipamentos que passam por calibracao. De quanto em quanto tempo calibrar
            e' definido no plano de calibracao, nao aqui.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <TextInput label="Ultima calibracao" type="date" {...register("lastCalibrationDate")} />
            <TextInput
              label="Periodicidade (meses)"
              type="number"
              hint="Ex.: 6 para calibrar a cada 6 meses, 12 para 1 ano."
              error={errors.calibrationFrequencyMonths?.message}
              {...register("calibrationFrequencyMonths")}
            />
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
            <TextInput label="Faixa de medicao" hint="Como sai no certificado. Ex.: 0 a 10 bar" {...register("measurementRange")} />
            <TextInput label="Resolucao" hint="Como sai no certificado. Ex.: 0,2 bar" {...register("resolution")} />
            <TextInput label="Unidade" {...register("unit")} />
          </div>

          {/* O que faz a calibracao calcular sozinha tolerancia, incerteza e resultado:
              cadastrado uma vez aqui, em vez de digitado ponto a ponto em cada calibracao. */}
          <div className="rounded-lg border border-navy-100 bg-navy-50/40 p-4">
            <h3 className="text-sm font-semibold text-navy-900">Critério de aceitação e dados para cálculo</h3>
            <p className="mt-1 text-xs text-graphite-500">
              Com isto preenchido, a calibração gera os pontos pela faixa e calcula tolerância, incerteza e resultado de
              cada ponto - o técnico só digita o valor padrão e as leituras.
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <TextInput label="Faixa - mínimo" inputMode="decimal" placeholder="0" {...register("rangeMin")} />
              <TextInput label="Faixa - máximo" inputMode="decimal" placeholder="Ex.: 10" {...register("rangeMax")} />
              <TextInput
                label="Resolução (número)"
                inputMode="decimal"
                placeholder="Ex.: 0,2"
                hint="Menor divisão ou dígito do instrumento."
                {...register("resolutionValue")}
              />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <SelectInput
                label="Tolerância expressa em"
                options={[
                  { value: "", label: "Não definida" },
                  { value: "PERCENT_FULL_SCALE", label: "% do fundo de escala" },
                  { value: "PERCENT_READING", label: "% do valor medido" },
                  { value: "ABSOLUTE", label: "Valor fixo (± na unidade)" },
                ]}
                {...register("toleranceMode")}
              />
              <TextInput
                label="Valor da tolerância"
                inputMode="decimal"
                placeholder={watch("toleranceMode") === "ABSOLUTE" ? "Ex.: 0,5" : "Ex.: 2"}
                hint={watch("toleranceMode") === "ABSOLUTE" ? "Na unidade do instrumento." : "Em %."}
                {...register("toleranceValue")}
              />
              <TextInput
                label="Classe de exatidão"
                placeholder="Ex.: B - 2%"
                hint="Opcional. Só o rótulo que sai no certificado."
                {...register("accuracyClass")}
              />
            </div>
          </div>
        </SecaoRecolhivel>
        </>
        )}

        {/* A unica coisa que o cadastro rapido pergunta alem do essencial, e so para a
            equipe interna: e' o que decide se o ativo entra na lista de calibracao da
            OptiProcess. O cliente nao ve - o que ele cadastra e' o parque dele. */}
        {modoRapido && user?.role !== "CLIENT" && (
          <CheckboxInput
            label="Ativo calibravel - aparece na lista de Ativos da OptiProcess"
            {...register("calibratable")}
          />
        )}

        {/* Ativo ja existente, calibrado antes de entrar na plataforma - registrar essa
            data aqui (sem precisar editar depois) e' o que da a base para as proximas
            calibracoes seguirem o ciclo certo, mesmo sem pontos cadastrados ainda. */}
        {modoRapido && (
          <TextInput
            label="Ultima calibracao (se ja foi calibrado antes)"
            type="date"
            hint="Opcional. Preencha se este ativo ja tinha uma calibracao anterior, mesmo fora da plataforma."
            {...register("lastCalibrationDate")}
          />
        )}

        {modoRapido && (
          <p className="rounded-lg bg-gray-50 px-4 py-3 text-xs text-graphite-500">
            Tipo do ativo, ficha do fabricante e demais dados de calibracao sao preenchidos
            depois, na ficha deste ativo. Para cadastrar, basta o que esta acima.
          </p>
        )}
      </form>
    </Modal>
  );
}
