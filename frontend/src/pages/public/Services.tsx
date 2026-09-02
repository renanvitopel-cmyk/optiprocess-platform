import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { serviceLines } from "../../lib/companyInfo";

export default function Services() {
  return (
    <div>
      <section className="bg-navy-950 py-16 text-white">
        <div className="container-page">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">Nossos servicos</h1>
          <p className="mt-3 max-w-2xl text-navy-200">
            Da instalacao eletrica a calibracao de ativos, oferecemos solucoes tecnicas completas para
            industria e comercio.
          </p>
        </div>
      </section>

      <section className="section-y bg-white">
        <div className="container-page grid gap-6 sm:grid-cols-2">
          {serviceLines.map((service) => (
            <Link key={service.slug} to={`/servicos/${service.slug}`} className="card flex flex-col gap-4 p-6 transition-shadow hover:shadow-md">
              <h2 className="text-xl font-bold text-navy-900">{service.title}</h2>
              <p className="text-graphite-500">{service.shortDescription}</p>
              <ul className="space-y-1.5 text-sm text-graphite-600">
                {service.items.slice(0, 3).map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-safety-yellow" />
                    {item}
                  </li>
                ))}
              </ul>
              <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-navy-700">
                Ver detalhes <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
