import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { TextInput, TextareaInput, SelectInput } from "../../components/form/Field";
import { submitPublicQuote } from "../../api/publicApi";
import { getApiErrorMessage } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import type { ServiceCategory } from "../../api/types";

const SERVICE_OPTIONS: { value: ServiceCategory; label: string }[] = [
  { value: "ELECTRICAL_MAINTENANCE", label: "Manutenção elétrica predial/industrial" },
  { value: "PANEL_MAINTENANCE", label: "Painéis elétricos (QGBT, CCM, automação)" },
  { value: "MOTOR_MAINTENANCE", label: "Manutenção de motores CA/CC" },
  { value: "TECHNICAL_REPORT", label: "Laudo técnico" },
  { value: "CALIBRATION", label: "Calibração de ativos" },
  { value: "TECHNICAL_ASSISTANCE", label: "Assistência técnica em inversores/eletrônicos" },
  { value: "EV_CHARGER", label: "Carregador para veículo elétrico" },
  { value: "CMMS_MAINTENANCE", label: "RLP Maintenance CMMS - gestão de manutenção" },
  { value: "OTHER", label: "Outro" },
];

const schema = z.object({
  contactName: z.string().min(2, "Informe seu nome."),
  contactEmail: z.string().email("Informe um e-mail válido."),
  contactPhone: z.string().min(8, "Informe um telefone válido."),
  serviceCategory: z.string().min(1, "Selecione o tipo de serviço."),
  message: z.string().min(10, "Descreva brevemente sua necessidade."),
});
type FormValues = z.infer<typeof schema>;

export default function RequestQuote() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  // Vindo do botao de um servico especifico (ex.: "Orcar calibracao"), o tipo ja
  // chega preenchido - o visitante nao precisa escolher de novo.
  const prefill = searchParams.get("servico");
  const prefillValid = SERVICE_OPTIONS.some((o) => o.value === prefill) ? (prefill as ServiceCategory) : undefined;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { contactName: user?.name ?? "", contactEmail: user?.email ?? "", serviceCategory: prefillValid ?? "" },
  });

  useEffect(() => {
    if (prefillValid) reset((values) => ({ ...values, serviceCategory: prefillValid }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillValid]);

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const result = await submitPublicQuote({
        source: "SERVICE_REQUEST",
        contactName: values.contactName,
        contactEmail: values.contactEmail,
        contactPhone: values.contactPhone,
        serviceCategory: values.serviceCategory as ServiceCategory,
        message: values.message,
      });
      setSubmitted(result.number);
    } catch (error) {
      setServerError(getApiErrorMessage(error));
    }
  }

  return (
    <div>
      <section className="bg-navy-950 py-14 text-white">
        <div className="container-page">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">Solicite um orçamento</h1>
          <p className="mt-3 max-w-2xl text-navy-200">
            Conte-nos sobre seu projeto ou necessidade e nossa equipe técnica retornará com uma proposta.
          </p>
        </div>
      </section>

      <section className="section-y bg-white">
        <div className="container-page max-w-2xl">
          {submitted ? (
            <div className="card flex flex-col items-center gap-3 p-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-safety-green" />
              <h2 className="text-xl font-bold text-navy-900">Solicitação enviada!</h2>
              <p className="text-graphite-500">
                Número da solicitação: <strong>{submitted}</strong>. Retornaremos em breve pelo e-mail ou telefone
                informado.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4 p-6" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextInput label="Nome" required error={errors.contactName?.message} {...register("contactName")} />
                <TextInput label="E-mail" type="email" required error={errors.contactEmail?.message} {...register("contactEmail")} />
              </div>
              <TextInput label="Telefone / WhatsApp" required error={errors.contactPhone?.message} {...register("contactPhone")} />
              <SelectInput
                label="Tipo de serviço"
                required
                placeholder="Selecione"
                options={SERVICE_OPTIONS}
                error={errors.serviceCategory?.message}
                {...register("serviceCategory")}
              />
              <TextareaInput
                label="Descreva sua necessidade"
                required
                rows={5}
                placeholder="Ex.: preciso de calibração de 3 manômetros para auditoria ISO 9001..."
                error={errors.message?.message}
                {...register("message")}
              />
              {serverError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-safety-red">{serverError}</p>}
              <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
                {isSubmitting ? "Enviando..." : "Enviar solicitação"}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
