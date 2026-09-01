import { Target, Eye, ShieldCheck } from "lucide-react";
import { company, differentials } from "../../lib/companyInfo";

export default function Company() {
  return (
    <div>
      <section className="bg-navy-950 py-16 text-white">
        <div className="container-page">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">Quem somos</h1>
          <p className="mt-3 max-w-2xl text-navy-200">{company.fullName}</p>
        </div>
      </section>

      <section className="section-y bg-white">
        <div className="container-page grid gap-8 sm:grid-cols-2">
          <div className="card p-6">
            <div className="flex items-center gap-2 text-navy-800">
              <Target className="h-5 w-5" />
              <h2 className="text-lg font-bold">Missao</h2>
            </div>
            <p className="mt-3 text-graphite-600">{company.mission}</p>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-2 text-navy-800">
              <Eye className="h-5 w-5" />
              <h2 className="text-lg font-bold">Visao</h2>
            </div>
            <p className="mt-3 text-graphite-600">{company.vision}</p>
          </div>
        </div>
      </section>

      <section className="section-y bg-gray-50">
        <div className="container-page">
          <h2 className="text-2xl font-bold text-navy-900">Nossos valores</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {differentials.map((d) => (
              <div key={d.title} className="card p-5">
                <ShieldCheck className="h-5 w-5 text-safety-green" />
                <h3 className="mt-3 font-semibold text-navy-900">{d.title}</h3>
                <p className="mt-1.5 text-sm text-graphite-500">{d.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
