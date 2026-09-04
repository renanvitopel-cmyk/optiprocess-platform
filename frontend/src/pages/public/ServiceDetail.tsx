import { Link, useParams } from "react-router-dom";
import { CheckCircle2, ArrowRight, Sparkles, Plug } from "lucide-react";
import { serviceLines } from "../../lib/companyInfo";
import { CmmsLogo } from "../../components/CmmsLogo";
import NotFound from "../NotFound";

export default function ServiceDetail() {
  const { slug } = useParams<{ slug: string }>();
  const service = serviceLines.find((s) => s.slug === slug);

  if (!service) return <NotFound />;

  const isPlatform = !!service.controls;
  const quoteLink = `/orcamento?servico=${service.serviceCategory}`;

  return (
    <div>
      <section className="bg-navy-950 py-16 text-white">
        <div className="container-page">
          <p className="text-sm font-semibold text-safety-yellow">{service.subtitle ?? "Serviços"}</p>
          {isPlatform ? (
            // O CMMS e' um produto com marca propria - na pagina dele, quem assina e' a
            // marca do produto. O site segue sendo da OptiProcess.
            <CmmsLogo variant="light" size="lg" className="mt-2" />
          ) : (
            <h1 className="mt-1 text-3xl font-bold text-white sm:text-4xl">{service.title}</h1>
          )}
          <p className="mt-3 max-w-2xl text-navy-200">{service.shortDescription}</p>
        </div>
      </section>

      <section className="section-y bg-white">
        <div className="container-page grid gap-10 lg:grid-cols-3">
          <div className="space-y-10 lg:col-span-2">
            <div>
              <h2 className="text-xl font-bold text-navy-900">{isPlatform ? "Controles de manutenção" : "O que fazemos"}</h2>
              <ul className="mt-4 space-y-3">
                {(service.controls ?? service.items).map((item) => (
                  <li key={item} className="flex items-start gap-3 text-graphite-700">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-safety-green" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {service.benefits && (
              <div>
                <h2 className="text-xl font-bold text-navy-900">Benefícios de assinar</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {service.benefits.map((b) => (
                    <div key={b.title} className="card p-5">
                      <Sparkles className="h-5 w-5 text-safety-yellow" />
                      <h3 className="mt-3 font-semibold text-navy-900">{b.title}</h3>
                      <p className="mt-1.5 text-sm text-graphite-500">{b.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {service.integrations && (
              <div>
                <h2 className="text-xl font-bold text-navy-900">Integrações</h2>
                <p className="mt-1 text-sm text-graphite-500">O CMMS conversa com o resto do que a OptiProcess já faz por você - nada fica solto.</p>
                <ul className="mt-4 space-y-3">
                  {service.integrations.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-graphite-700">
                      <Plug className="mt-0.5 h-5 w-5 shrink-0 text-navy-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="card h-fit p-6">
            <h3 className="font-bold text-navy-900">{isPlatform ? "Quer assinar o CMMS?" : "Precisa deste serviço?"}</h3>
            <p className="mt-2 text-sm text-graphite-500">
              {isPlatform
                ? "Fale com nossa equipe pra conhecer os planos de assinatura e colocar sua manutenção pra rodar no sistema."
                : "Solicite um orçamento sem compromisso e nossa equipe técnica entrará em contato."}
            </p>
            <Link to={quoteLink} className="btn-primary mt-4 w-full justify-center">
              {service.ctaLabel} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="section-y bg-gray-50">
        <div className="container-page">
          <h2 className="text-xl font-bold text-navy-900">Outros serviços</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {serviceLines
              .filter((s) => s.slug !== service.slug)
              .map((s) => (
                <Link key={s.slug} to={`/servicos/${s.slug}`} className="card p-4 text-sm font-medium text-navy-800 hover:shadow-md">
                  {s.title}
                </Link>
              ))}
          </div>
        </div>
      </section>
    </div>
  );
}
