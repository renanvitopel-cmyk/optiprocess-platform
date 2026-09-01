import { Link, useParams } from "react-router-dom";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { serviceLines } from "../../lib/companyInfo";
import NotFound from "../NotFound";

export default function ServiceDetail() {
  const { slug } = useParams<{ slug: string }>();
  const service = serviceLines.find((s) => s.slug === slug);

  if (!service) return <NotFound />;

  return (
    <div>
      <section className="bg-navy-950 py-16 text-white">
        <div className="container-page">
          <p className="text-sm font-semibold text-safety-yellow">Servicos</p>
          <h1 className="mt-1 text-3xl font-bold text-white sm:text-4xl">{service.title}</h1>
          <p className="mt-3 max-w-2xl text-navy-200">{service.shortDescription}</p>
        </div>
      </section>

      <section className="section-y bg-white">
        <div className="container-page grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-navy-900">O que fazemos</h2>
            <ul className="mt-4 space-y-3">
              {service.items.map((item) => (
                <li key={item} className="flex items-start gap-3 text-graphite-700">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-safety-green" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="card h-fit p-6">
            <h3 className="font-bold text-navy-900">Precisa deste servico?</h3>
            <p className="mt-2 text-sm text-graphite-500">
              Solicite um orcamento sem compromisso e nossa equipe tecnica entrara em contato.
            </p>
            <Link to="/orcamento" className="btn-primary mt-4 w-full justify-center">
              Solicitar orcamento <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="section-y bg-gray-50">
        <div className="container-page">
          <h2 className="text-xl font-bold text-navy-900">Outros servicos</h2>
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
