import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, MapPin, Phone, Mail, MessageCircle } from "lucide-react";
import { TextInput, TextareaInput } from "../../components/form/Field";
import { submitPublicQuote } from "../../api/publicApi";
import { getPublicConfig } from "../../api/publicApi";
import { getApiErrorMessage } from "../../api/client";
import { company } from "../../lib/companyInfo";
import { buildWhatsAppLink } from "../../components/WhatsAppButton";

const schema = z.object({
  contactName: z.string().min(2, "Informe seu nome."),
  contactEmail: z.string().email("Informe um e-mail válido."),
  contactPhone: z.string().optional(),
  message: z.string().min(5, "Escreva sua mensagem."),
});
type FormValues = z.infer<typeof schema>;

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { data: config } = useQuery({ queryKey: ["public-config"], queryFn: getPublicConfig });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await submitPublicQuote({
        source: "CONTACT",
        contactName: values.contactName,
        contactEmail: values.contactEmail,
        contactPhone: values.contactPhone,
        message: values.message,
      });
      setSubmitted(true);
    } catch (error) {
      setServerError(getApiErrorMessage(error));
    }
  }

  return (
    <div>
      <section className="bg-navy-950 py-14 text-white">
        <div className="container-page">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">Contato</h1>
          <p className="mt-3 max-w-2xl text-navy-200">Fale com a nossa equipe. Respondemos o mais rápido possível.</p>
        </div>
      </section>

      <section className="section-y bg-white">
        <div className="container-page grid gap-10 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-1">
            <ContactRow icon={MapPin} text={company.address} />
            <ContactRow icon={Phone} text={company.phoneDisplay} />
            <ContactRow icon={Mail} text={company.email} />
            {config?.whatsappNumber && (
              <a
                href={buildWhatsAppLink(config.whatsappNumber, "Olá! Gostaria de falar com a OptiProcess.")}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full justify-center"
              >
                <MessageCircle className="h-4 w-4" /> Falar no WhatsApp
              </a>
            )}
          </div>

          <div className="lg:col-span-2">
            {submitted ? (
              <div className="card flex flex-col items-center gap-3 p-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-safety-green" />
                <h2 className="text-xl font-bold text-navy-900">Mensagem enviada!</h2>
                <p className="text-graphite-500">Retornaremos o mais breve possível.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4 p-6" noValidate>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextInput label="Nome" required error={errors.contactName?.message} {...register("contactName")} />
                  <TextInput label="E-mail" type="email" required error={errors.contactEmail?.message} {...register("contactEmail")} />
                </div>
                <TextInput label="Telefone" error={errors.contactPhone?.message} {...register("contactPhone")} />
                <TextareaInput label="Mensagem" required rows={5} error={errors.message?.message} {...register("message")} />
                {serverError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-safety-red">{serverError}</p>}
                <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Enviando..." : "Enviar mensagem"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function ContactRow({ icon: Icon, text }: { icon: typeof MapPin; text: string }) {
  return (
    <div className="flex items-start gap-3 text-graphite-700">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-navy-700" />
      <span>{text}</span>
    </div>
  );
}
