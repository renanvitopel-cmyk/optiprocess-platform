import { useSearchParams, useNavigate } from "react-router-dom";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "../../../components/PageHeader";
import { TextInput, TextareaInput, SelectInput } from "../../../components/form/Field";
import { ClientPicker } from "../../../components/ClientPicker";
import { InstrumentPicker } from "../../../components/InstrumentPicker";
import { UserPicker } from "../../../components/UserPicker";
import { createCalibration } from "../../../api/calibrations";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";

const pointSchema = z.object({
  standardValue: z.coerce.number(),
  indicatedValue: z.coerce.number(),
  error: z.coerce.number(),
  tolerance: z.coerce.number(),
  uncertainty: z.coerce.number(),
  result: z.enum(["PASS", "FAIL"]),
});

const standardSchema = z.object({
  description: z.string().min(1, "Descreva o padrao."),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  certificateNumber: z.string().optional(),
  certificateValidUntil: z.string().optional(),
  laboratory: z.string().optional(),
});

const schema = z.object({
  clientId: z.string().uuid("Selecione o cliente."),
  instrumentId: z.string().uuid("Selecione o instrumento."),
  technicianId: z.string().uuid("Selecione o tecnico responsavel."),
  calibrationDate: z.string().min(1, "Informe a data."),
  location: z.string().min(1, "Informe o local."),
  procedure: z.string().optional(),
  coverageFactorK: z.coerce.number().optional(),
  ambientTemperature: z.coerce.number().optional(),
  ambientHumidity: z.coerce.number().optional(),
  environmentalNotes: z.string().optional(),
  result: z.enum(["APPROVED", "APPROVED_WITH_RESTRICTION", "REJECTED"]),
  technicalConclusion: z.string().min(1, "Informe a conclusao tecnica."),
  observations: z.string().optional(),
  validUntil: z.string().min(1, "Informe a validade."),
  points: z.array(pointSchema).min(1, "Inclua ao menos um ponto calibrado."),
  standards: z.array(standardSchema).min(1, "Informe ao menos um padrao utilizado."),
});
type FormValues = z.infer<typeof schema>;

const EMPTY_STANDARD = {
  description: "",
  manufacturer: "",
  model: "",
  serialNumber: "",
  certificateNumber: "",
  certificateValidUntil: "",
  laboratory: "",
};

export default function CalibrationForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { notify } = useToast();

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientId: searchParams.get("clientId") ?? "",
      instrumentId: searchParams.get("instrumentId") ?? "",
      result: "APPROVED",
      coverageFactorK: 2,
      points: [{ standardValue: 0, indicatedValue: 0, error: 0, tolerance: 0, uncertainty: 0, result: "PASS" }],
      standards: [{ ...EMPTY_STANDARD }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "points" });
  const {
    fields: standardFields,
    append: appendStandard,
    remove: removeStandard,
  } = useFieldArray({ control, name: "standards" });
  const clientId = watch("clientId");

  async function onSubmit(values: FormValues) {
    try {
      const calibration = await createCalibration(values);
      notify("success", `Certificado ${calibration.certificateNumber} criado como rascunho.`);
      navigate(`/gestao/calibracoes/${calibration.id}`);
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  return (
    <div>
      <PageHeader
        title="Novo certificado de calibracao"
        breadcrumbs={[{ label: "Calibracoes", to: "/gestao/calibracoes" }, { label: "Novo" }]}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <div className="card space-y-4 p-5">
          <h2 className="font-semibold text-navy-900">Identificacao</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <ClientPicker required error={errors.clientId?.message} {...register("clientId")} />
            <InstrumentPicker clientId={clientId} required error={errors.instrumentId?.message} {...register("instrumentId")} />
            <UserPicker label="Tecnico responsavel" roles={["ADMIN", "TECHNICIAN"]} required error={errors.technicianId?.message} {...register("technicianId")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <TextInput label="Data da calibracao" type="date" required error={errors.calibrationDate?.message} {...register("calibrationDate")} />
            <TextInput label="Local" required error={errors.location?.message} {...register("location")} />
            <TextInput label="Validade ate" type="date" required error={errors.validUntil?.message} {...register("validUntil")} />
          </div>
        </div>

        <div className="card space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-navy-900">Padroes utilizados e rastreabilidade</h2>
              <p className="mt-1 text-xs text-graphite-500">
                Informe o certificado de cada padrao usado. E o que garante a cadeia de rastreabilidade do documento.
              </p>
            </div>
            <button type="button" className="btn-ghost btn-sm shrink-0" onClick={() => appendStandard({ ...EMPTY_STANDARD })}>
              <Plus className="h-4 w-4" /> Adicionar padrao
            </button>
          </div>
          {errors.standards?.message && <p className="field-error">{errors.standards.message}</p>}

          <div className="space-y-4">
            {standardFields.map((field, index) => (
              <div key={field.id} className="rounded-lg border border-gray-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-graphite-400">
                    Padrao {index + 1}
                  </span>
                  {standardFields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStandard(index)}
                      className="text-graphite-400 hover:text-safety-red"
                      aria-label={`Remover padrao ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <TextInput
                    label="Descricao do padrao"
                    required
                    className="sm:col-span-2"
                    placeholder="Ex.: Calibrador de temperatura de bloco seco"
                    error={errors.standards?.[index]?.description?.message}
                    {...register(`standards.${index}.description`)}
                  />
                  <TextInput label="Fabricante" {...register(`standards.${index}.manufacturer`)} />
                  <TextInput label="Modelo" {...register(`standards.${index}.model`)} />
                  <TextInput label="No de serie" {...register(`standards.${index}.serialNumber`)} />
                  <TextInput label="No do certificado" {...register(`standards.${index}.certificateNumber`)} />
                  <TextInput
                    label="Validade do certificado"
                    type="date"
                    {...register(`standards.${index}.certificateValidUntil`)}
                  />
                  <TextInput
                    label="Laboratorio emissor"
                    className="sm:col-span-2"
                    placeholder="Ex.: RBC / Rede Brasileira de Calibracao"
                    {...register(`standards.${index}.laboratory`)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card space-y-4 p-5">
          <h2 className="font-semibold text-navy-900">Metodo e condicoes ambientais</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Metodo / procedimento"
              placeholder="Ex.: IT-CAL-001 / comparacao direta"
              {...register("procedure")}
            />
            <TextInput
              label="Fator de abrangencia (k)"
              type="number"
              step="0.01"
              hint="Padrao k=2, equivalente a ~95% de confianca."
              {...register("coverageFactorK")}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <TextInput label="Temperatura ambiente (°C)" type="number" step="0.1" {...register("ambientTemperature")} />
            <TextInput label="Umidade relativa (%)" type="number" step="0.1" {...register("ambientHumidity")} />
            <TextInput label="Observacoes ambientais" {...register("environmentalNotes")} />
          </div>
        </div>

        <div className="card space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-navy-900">Pontos calibrados</h2>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => append({ standardValue: 0, indicatedValue: 0, error: 0, tolerance: 0, uncertainty: 0, result: "PASS" })}
            >
              <Plus className="h-4 w-4" /> Adicionar ponto
            </button>
          </div>
          {errors.points?.message && <p className="field-error">{errors.points.message}</p>}

          <div className="table-shell">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Valor padrao</th>
                  <th>Valor indicado</th>
                  <th>Erro</th>
                  <th>Tolerancia</th>
                  <th>Incerteza</th>
                  <th>Resultado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => (
                  <tr key={field.id}>
                    <td><input className="input" type="number" step="any" {...register(`points.${index}.standardValue`)} /></td>
                    <td><input className="input" type="number" step="any" {...register(`points.${index}.indicatedValue`)} /></td>
                    <td><input className="input" type="number" step="any" {...register(`points.${index}.error`)} /></td>
                    <td><input className="input" type="number" step="any" {...register(`points.${index}.tolerance`)} /></td>
                    <td><input className="input" type="number" step="any" {...register(`points.${index}.uncertainty`)} /></td>
                    <td>
                      <Controller
                        control={control}
                        name={`points.${index}.result`}
                        render={({ field: f }) => (
                          <select className="input" {...f}>
                            <option value="PASS">Aprovado</option>
                            <option value="FAIL">Reprovado</option>
                          </select>
                        )}
                      />
                    </td>
                    <td>
                      {fields.length > 1 && (
                        <button type="button" onClick={() => remove(index)} className="text-graphite-400 hover:text-safety-red" aria-label="Remover ponto">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card space-y-4 p-5">
          <h2 className="font-semibold text-navy-900">Resultado</h2>
          <SelectInput
            label="Resultado final"
            required
            options={[
              { value: "APPROVED", label: "Aprovado" },
              { value: "APPROVED_WITH_RESTRICTION", label: "Aprovado com ressalva" },
              { value: "REJECTED", label: "Reprovado" },
            ]}
            error={errors.result?.message}
            {...register("result")}
          />
          <TextareaInput label="Conclusao tecnica" required rows={4} error={errors.technicalConclusion?.message} {...register("technicalConclusion")} />
          <TextareaInput
            label="Observacoes (opcional)"
            rows={3}
            hint="Sai no certificado, abaixo da conclusao."
            {...register("observations")}
          />
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" className="btn-outline" onClick={() => navigate(-1)}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar rascunho"}
          </button>
        </div>
      </form>
    </div>
  );
}
