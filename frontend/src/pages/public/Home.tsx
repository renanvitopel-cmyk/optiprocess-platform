import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ShieldCheck, BadgeCheck, FileWarning, Zap, Star, Wrench } from "lucide-react";
import { company, differentials, serviceLines } from "../../lib/companyInfo";
import { listProducts } from "../../api/products";
import { formatCurrency } from "../../lib/format";
import { InlineSpinner } from "../../components/Spinner";
import { LogoFull } from "../../components/Logo";

export default function Home() {
  const { data: featured, isLoading } = useQuery({
    queryKey: ["public-products", "featured"],
    queryFn: () => listProducts({ featured: true, pageSize: 4 }),
  });

  return (
    <div>
      <section className="relative overflow-hidden bg-navy-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,180,0,0.12),transparent_55%)]" />
        <div className="container-page relative flex flex-col items-center gap-10 py-20 sm:py-28 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
          <div className="flex flex-col items-start gap-6 lg:max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-safety-yellow/30 bg-safety-yellow/10 px-3 py-1 text-xs font-semibold text-safety-yellow">
              <ShieldCheck className="h-3.5 w-3.5" /> Seguranca e excelencia tecnica industrial
            </span>
            <h1 className="max-w-2xl text-4xl font-extrabold leading-tight text-white sm:text-5xl">
              Eletrica, instrumentacao e calibracao com a confianca que a sua operacao precisa
            </h1>
            <p className="max-w-xl text-lg text-navy-200">
              {company.fullName}. Manutencao eletrica predial e industrial, calibracao rastreavel, laudos tecnicos e
              assistencia especializada para manter sua planta segura e em pleno funcionamento.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/orcamento" className="btn-primary">
                Solicitar orcamento <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/servicos" className="btn-outline border-white/30 bg-transparent text-white hover:bg-white/10">
                Conhecer servicos
              </Link>
            </div>
          </div>

          <div className="shrink-0 rounded-2xl bg-white p-8 shadow-2xl sm:p-10">
            <LogoFull variant="dark" className="h-36 w-auto sm:h-44" />
          </div>
        </div>
      </section>

      <section className="section-y bg-white">
        <div className="container-page">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <HighlightCard
              icon={BadgeCheck}
              title="Calibracao rastreavel"
              description="Certificados com rastreabilidade RBC, QR Code de autenticidade e validacao publica online."
              to="/servicos/calibracao-instrumentacao"
            />
            <HighlightCard
              icon={FileWarning}
              title="Laudos tecnicos"
              description="Instalacoes eletricas, termografia infravermelha, aterramento e SPDA com validade tecnica."
              to="/servicos/laudos-tecnicos"
            />
            <HighlightCard
              icon={Zap}
              title="Manutencao eletrica"
              description="Predial e industrial, paineis, QGBT, CCM e motores CA/CC com equipe especializada."
              to="/servicos/manutencao-eletrica"
            />
            <HighlightCard
              icon={Wrench}
              title="RLP Maintenance CMMS"
              description="Assine o software de gestao de manutencao: planos, ordens, almoxarifado, mao de obra e custo por ativo."
              to="/servicos/rlp-maintenance-cmms"
            />
          </div>
        </div>
      </section>

      <section className="section-y bg-gray-50">
        <div className="container-page">
          <h2 className="text-2xl font-bold text-navy-900 sm:text-3xl">Nossos servicos</h2>
          <p className="mt-2 max-w-2xl text-graphite-500">
            Solucoes completas para instalacao, manutencao, instrumentacao e assistencia tecnica industrial.
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {serviceLines.map((service) => (
              <Link
                key={service.slug}
                to={`/servicos/${service.slug}`}
                className="card group flex flex-col p-5 transition-shadow hover:shadow-md"
              >
                <h3 className="font-semibold text-navy-900 group-hover:text-navy-700">{service.title}</h3>
                <p className="mt-2 flex-1 text-sm text-graphite-500">{service.shortDescription}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-navy-700">
                  Saiba mais <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section-y bg-navy-950 text-white">
        <div className="container-page">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Nossos diferenciais</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {differentials.map((d) => (
              <div key={d.title} className="rounded-xl border border-white/10 bg-white/5 p-5">
                <ShieldCheck className="h-5 w-5 text-safety-yellow" />
                <h3 className="mt-3 font-semibold text-white">{d.title}</h3>
                <p className="mt-1.5 text-sm text-navy-300">{d.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-y bg-white">
        <div className="container-page">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-navy-900 sm:text-3xl">Produtos em destaque</h2>
              <p className="mt-2 text-graphite-500">Materiais eletricos, automacao Gefran e carregadores WEG WEMOB.</p>
            </div>
            <Link to="/produtos" className="hidden text-sm font-medium text-navy-700 hover:underline sm:inline">
              Ver catalogo completo
            </Link>
          </div>

          {isLoading && <InlineSpinner label="Carregando produtos..." />}

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured?.items.map((product) => (
              <Link key={product.id} to={`/produtos/${product.slug}`} className="card overflow-hidden transition-shadow hover:shadow-md">
                <div className="flex h-32 items-center justify-center bg-navy-50 text-navy-300">
                  <Star className="h-8 w-8" />
                </div>
                <div className="p-4">
                  <p className="text-xs uppercase tracking-wide text-graphite-400">{product.brand}</p>
                  <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-navy-900">{product.name}</h3>
                  <p className="mt-2 font-bold text-navy-800">
                    {product.priceOnRequest ? "Sob consulta" : formatCurrency(product.price)}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <Link to="/produtos" className="btn-outline mt-6 w-full justify-center sm:hidden">
            Ver catalogo completo
          </Link>
        </div>
      </section>

      <section className="section-y bg-safety-yellow">
        <div className="container-page flex flex-col items-center gap-4 text-center">
          <h2 className="text-2xl font-bold text-navy-950 sm:text-3xl">Precisa de um orcamento?</h2>
          <p className="max-w-xl text-navy-900">
            Conte-nos sobre o seu projeto ou necessidade de manutencao, calibracao ou laudo tecnico. Nossa equipe
            responde rapidamente.
          </p>
          <Link to="/orcamento" className="btn-secondary">
            Solicitar orcamento agora
          </Link>
        </div>
      </section>
    </div>
  );
}

function HighlightCard({
  icon: Icon,
  title,
  description,
  to,
}: {
  icon: typeof BadgeCheck;
  title: string;
  description: string;
  to: string;
}) {
  return (
    <Link to={to} className="card flex flex-col gap-3 p-6 transition-shadow hover:shadow-md">
      <div className="w-fit rounded-lg bg-navy-50 p-2.5 text-navy-700">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-semibold text-navy-900">{title}</h3>
      <p className="text-sm text-graphite-500">{description}</p>
    </Link>
  );
}
