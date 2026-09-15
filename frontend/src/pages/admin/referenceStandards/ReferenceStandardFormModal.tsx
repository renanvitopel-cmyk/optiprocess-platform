import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera, X } from "lucide-react";
import { Modal } from "../../../components/Modal";
import { TextInput } from "../../../components/form/Field";
import {
  createReferenceStandard,
  updateReferenceStandard,
  uploadReferenceStandardPhoto,
  deleteReferenceStandardPhoto,
  type ReferenceStandard,
} from "../../../api/referenceStandards";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";

const schema = z.object({
  description: z.string().min(2, "Informe a descricao do padrao."),
  type: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  measurementRange: z.string().optional(),
  resolution: z.string().optional(),
  unit: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (item: ReferenceStandard) => void;
  standard?: ReferenceStandard;
}

export function ReferenceStandardFormModal({ open, onClose, onSaved, standard }: Props) {
  const { notify } = useToast();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const [foto, setFoto] = useState<File | null>(null);
  const [fotoRemovida, setFotoRemovida] = useState(false);
  const previewFoto = foto ? URL.createObjectURL(foto) : fotoRemovida ? null : standard?.photoUrl ?? null;

  useEffect(() => {
    if (open) {
      setFoto(null);
      setFotoRemovida(false);
      reset(
        standard
          ? {
              description: standard.description,
              type: standard.type ?? "",
              manufacturer: standard.manufacturer ?? "",
              model: standard.model ?? "",
              serialNumber: standard.serialNumber ?? "",
              measurementRange: standard.measurementRange ?? "",
              resolution: standard.resolution ?? "",
              unit: standard.unit ?? "",
            }
          : { description: "" },
      );
    }
  }, [open, standard, reset]);

  async function onSubmit(values: FormValues) {
    try {
      let saved = standard ? await updateReferenceStandard(standard.id, values) : await createReferenceStandard(values);

      if (foto) saved = await uploadReferenceStandardPhoto(saved.id, foto);
      else if (fotoRemovida && standard?.photoUrl) await deleteReferenceStandardPhoto(saved.id);

      notify("success", standard ? "Padrao atualizado." : "Padrao cadastrado.");
      onSaved(saved);
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={standard ? "Editar padrao de referencia" : "Novo padrao de referencia"}
      size="lg"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose}>Cancelar</button>
          <button type="submit" form="reference-standard-form" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar"}
          </button>
        </>
      }
    >
      <form id="reference-standard-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <TextInput
          label="Descricao"
          required
          placeholder="Ex.: Termometro padrao ITS-90"
          error={errors.description?.message}
          {...register("description")}
        />

        <div className="flex items-center gap-4">
          {previewFoto ? (
            <img src={previewFoto} alt="Foto do padrao" className="h-20 w-20 shrink-0 rounded-lg border border-gray-200 object-cover" />
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
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <TextInput label="Tipo" placeholder="Ex.: Termometro, Manometro" {...register("type")} />
          <TextInput label="Fabricante" {...register("manufacturer")} />
          <TextInput label="Modelo" {...register("model")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextInput label="Numero de serie" {...register("serialNumber")} />
          <TextInput label="Faixa de medicao" {...register("measurementRange")} />
          <TextInput label="Resolucao" {...register("resolution")} />
        </div>
        <TextInput label="Unidade" className="sm:w-1/3" {...register("unit")} />
      </form>
    </Modal>
  );
}
