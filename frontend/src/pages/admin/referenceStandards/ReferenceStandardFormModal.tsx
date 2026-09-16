import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera, Paperclip, X } from "lucide-react";
import { Modal } from "../../../components/Modal";
import { TextInput } from "../../../components/form/Field";
import {
  createReferenceStandard,
  updateReferenceStandard,
  uploadReferenceStandardPhoto,
  deleteReferenceStandardPhoto,
  createReferenceStandardCertificate,
  type ReferenceStandard,
} from "../../../api/referenceStandards";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";

const schema = z
  .object({
    description: z.string().min(2, "Informe a descricao do padrao."),
    type: z.string().optional(),
    manufacturer: z.string().optional(),
    model: z.string().optional(),
    serialNumber: z.string().optional(),
    measurementRange: z.string().optional(),
    resolution: z.string().optional(),
    unit: z.string().optional(),
    // Certificado: coisa distinta da foto do equipamento (uma e' a imagem do padrao, a
    // outra e' o documento do laboratorio) - ambos cabem no mesmo cadastro, mas continuam
    // sendo dois anexos separados. So' exigido se algum campo do certificado for
    // preenchido (o padrao pode ser cadastrado sem certificado ainda).
    certificateNumber: z.string().optional(),
    laboratory: z.string().optional(),
    calibrationDate: z.string().optional(),
    validUntil: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    const temAlgumCampoDoCertificado = !!(values.certificateNumber || values.laboratory || values.calibrationDate || values.validUntil);
    if (!temAlgumCampoDoCertificado) return;
    if (!values.calibrationDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["calibrationDate"], message: "Informe a data da calibracao." });
    }
    if (!values.validUntil) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["validUntil"], message: "Informe a validade." });
    }
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

  // Arquivo do certificado (PDF do laboratorio) - anexo diferente da foto do equipamento.
  const [certificadoArquivo, setCertificadoArquivo] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      setFoto(null);
      setFotoRemovida(false);
      setCertificadoArquivo(null);
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
      const {
        certificateNumber, laboratory, calibrationDate, validUntil,
        ...padraoValues
      } = values;

      let saved = standard ? await updateReferenceStandard(standard.id, padraoValues) : await createReferenceStandard(padraoValues);

      if (foto) saved = await uploadReferenceStandardPhoto(saved.id, foto);
      else if (fotoRemovida && standard?.photoUrl) await deleteReferenceStandardPhoto(saved.id);

      // Certificado e' um anexo distinto da foto - so' cria se a data da calibracao e a
      // validade foram preenchidas (o padrao pode ser cadastrado sem certificado ainda).
      if (calibrationDate && validUntil) {
        await createReferenceStandardCertificate(saved.id, {
          certificateNumber: certificateNumber || null,
          laboratory: laboratory || null,
          calibrationDate,
          validUntil,
          file: certificadoArquivo,
        });
      }

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

        {/* Certificado: documento do laboratorio que calibrou o padrao - anexo diferente
            da foto do equipamento acima, por isso fica numa secao separada. */}
        <div className="border-t border-gray-100 pt-4">
          <h3 className="mb-1 text-sm font-semibold text-navy-900">Certificado</h3>
          <p className="mb-3 text-xs text-graphite-500">
            Opcional aqui - se o padrao ainda nao tem certificado, cadastre depois na ficha dele. Preenchendo a data
            e a validade, o certificado ja fica registrado junto com o cadastro.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Numero do certificado" {...register("certificateNumber")} />
            <TextInput label="Laboratorio" {...register("laboratory")} />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Data da calibracao"
              type="date"
              error={errors.calibrationDate?.message}
              {...register("calibrationDate")}
            />
            <TextInput
              label="Validade"
              type="date"
              hint="Normalmente 1 ano apos a calibracao."
              error={errors.validUntil?.message}
              {...register("validUntil")}
            />
          </div>
          <div className="mt-4">
            <label className="btn-outline inline-flex cursor-pointer items-center gap-2 text-sm">
              <Paperclip className="h-4 w-4" />
              {certificadoArquivo ? certificadoArquivo.name : "Anexar PDF do certificado"}
              <input
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => setCertificadoArquivo(e.target.files?.[0] ?? null)}
              />
            </label>
            <p className="mt-1 text-xs text-graphite-400">Opcional.</p>
          </div>
        </div>
      </form>
    </Modal>
  );
}
