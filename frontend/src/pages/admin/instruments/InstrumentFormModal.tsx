import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera, X } from "lucide-react";
import { SecaoRecolhivel } from "../../../components/SecaoRecolhivel";
import { Modal } from "../../../components/Modal";
import { TextInput, SelectInput, CheckboxInput } from "../../../components/form/Field";
import { ClientPicker } from "../../../components/ClientPicker";
import { AssetTypeInput } from "../../../components/AssetTypeInput";
import { createInstrument, updateInstrument, uploadInstrumentPhoto, deleteInstrumentPhoto } from "../../../api/instruments";
import type { Instrument } from "../../../api/types";
import { useAuth } from "../../../auth/AuthContext";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";

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
  lastCalibrationDate: z.string().optional(),
  status: z.enum(["VALID", "DUE_SOON", "EXPIRED", "IN_MAINTENANCE"]).optional(),
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
              lastCalibrationDate: instrument.lastCalibrationDate?.slice(0, 10) ?? "",
              status: instrument.status,
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

        {modoRapido && (
          <p className="rounded-lg bg-gray-50 px-4 py-3 text-xs text-graphite-500">
            Tipo do ativo, ficha do fabricante e calibracao sao preenchidos depois, na ficha
            deste ativo. Para cadastrar, basta o que esta acima.
          </p>
        )}
      </form>
    </Modal>
  );
}
