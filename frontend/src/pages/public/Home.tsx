import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ShieldCheck, BadgeCheck, FileWarning, Zap, Star, Wrench, MapPin } from "lucide-react";
import { company, differentials, serviceLines } from "../../lib/companyInfo";
import { listProducts } from "../../api/products";
import { formatCurrency } from "../../lib/format";
import { InlineSpinner } from "../../components/Spinner";

export default function Home() {
  const { data: featured, isLoading } = useQuery({
    queryKey: ["public-products", "featured"],
    queryFn: () => listProducts({ featured: true, pageSize: 4 }),
  });

  return (
    <div>
      <section className="relative overflow-hidden bg-navy-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,180,0,0.12),transparent_55%)]" />
        <div className="container-page relative grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col items-start gap-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-safety-yellow/30 bg-safety-yellow/10 px-3 py-1 text-xs font-semibold text-safety-yellow">
            <ShieldCheck className="h-3.5 w-3.5" /> Segurança e excelência técnica industrial
          </span>
          <h1 className="max-w-2xl text-4xl font-extrabold leading-tight text-white sm:text-5xl">
            Manutenção elétrica, calibração e laudos para sua operação não parar
          </h1>
          <p className="max-w-xl text-lg text-navy-200">
            {company.fullName}. Manutenção elétrica predial e industrial, calibração rastreável, laudos técnicos e
            assistência especializada para manter sua planta segura e em pleno funcionamento.
          </p>
          <p className="flex items-center gap-2 text-sm font-medium text-navy-300">
            <MapPin className="h-4 w-4 text-safety-yellow" /> Atendimento em Sorocaba e região
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/orcamento" className="btn-primary">
              Solicitar orçamento <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/servicos" className="btn-outline border-white/30 bg-transparent text-white hover:bg-white/10">
              Conhecer serviços
            </Link>
          </div>
          </div>

          {/* O lado direito estava vazio. Em vez de uma foto generica de banco de imagem,
              mostra o proprio produto: um recorte do painel do CMMS, que e' o que a
              OptiProcess vende por assinatura. */}
          <HeroPanel />
        </div>
      </section>

      <section className="section-y bg-white">
        <div className="container-page">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <HighlightCard
              icon={BadgeCheck}
              title="Calibração rastreável"
              description="Certificados com cadeia de rastreabilidade metrológica, QR Code de autenticidade e validação pública online."
              to="/servicos/calibracao-instrumentacao"
            />
            <HighlightCard
              icon={FileWarning}
              title="Laudos técnicos"
              description="Instalações elétricas, termografia infravermelha, aterramento e SPDA com validade técnica."
              to="/servicos/laudos-tecnicos"
            />
            <HighlightCard
              icon={Zap}
              title="Manutenção elétrica"
              description="Predial e industrial, painéis, QGBT, CCM e motores CA/CC com equipe especializada."
              to="/servicos/manutencao-eletrica"
            />
            <HighlightCard
              icon={Wrench}
              title="RLP Maintenance CMMS"
              description="Assine o software de gestão de manutenção: planos, ordens, almoxarifado, mão de obra e custo por ativo."
              to="/servicos/rlp-maintenance-cmms"
            />
          </div>
        </div>
      </section>

      <section className="section-y bg-gray-50">
        <div className="container-page">
          <h2 className="text-2xl font-bold text-navy-900 sm:text-3xl">Nossos serviços</h2>
          <p className="mt-2 max-w-2xl text-graphite-500">
            Soluções completas para instalação, manutenção, instrumentação e assistência técnica industrial.
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
              <p className="mt-2 text-graphite-500">Materiais elétricos, automação Gefran e carregadores WEG WEMOB.</p>
            </div>
            <Link to="/produtos" className="hidden text-sm font-medium text-navy-700 hover:underline sm:inline">
              Ver catálogo completo
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
            Ver catálogo completo
          </Link>
        </div>
      </section>

      <section className="section-y bg-safety-yellow">
        <div className="container-page flex flex-col items-center gap-4 text-center">
          <h2 className="text-2xl font-bold text-navy-950 sm:text-3xl">Precisa de um orçamento?</h2>
          <p className="max-w-xl text-navy-900">
            Conte-nos sobre o seu projeto ou necessidade de manutenção, calibração ou laudo técnico. Nossa equipe
            responde rapidamente.
          </p>
          <Link to="/orcamento" className="btn-secondary">
            Solicitar orçamento agora
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


/**
 * Recorte estilizado do painel do CMMS para o hero. Desenhado em CSS/SVG, nao e' captura
 * de tela: nao envelhece quando a interface muda e nao expoe dado de cliente nenhum.
 */
function HeroPanel() {
  const barras = [38, 52, 44, 68, 58, 80, 72];

  return (
    <div className="relative hidden lg:block" aria-hidden="true">
      {/* brilho por tras, para o cartao nao flutuar sobre preto chapado */}
      <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-safety-yellow/10 via-transparent to-safety-green/10 blur-2xl" />

      <div className="relative rounded-2xl border border-white/10 bg-navy-900/80 p-5 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-navy-400">Painel de manutenção</p>
            <p className="text-sm font-bold text-white">RLP Maintenance</p>
          </div>
          <span className="rounded-full bg-safety-green/15 px-2 py-0.5 text-[10px] font-semibold text-safety-green">
            ● Em operação
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { rotulo: "Disponibilidade", valor: "97,4%" },
            { rotulo: "MTBF", valor: "412h" },
            { rotulo: "Preventivas", valor: "88%" },
          ].map((kpi) => (
            <div key={kpi.rotulo} className="rounded-lg bg-white/5 p-2.5">
              <p className="text-[9px] uppercase tracking-wide text-navy-400">{kpi.rotulo}</p>
              <p className="mt-0.5 text-base font-bold text-white">{kpi.valor}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg bg-white/5 p-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wide text-navy-400">Ordens concluídas por semana</p>
            <p className="text-[10px] font-medium text-safety-green">+18%</p>
          </div>
          <div className="mt-2.5 flex h-16 items-end gap-1.5">
            {barras.map((altura, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t ${i === barras.length - 1 ? "bg-safety-yellow" : "bg-white/20"}`}
                style={{ height: `${altura}%` }}
              />
            ))}
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          {[
            { tag: "CP-001", texto: "Preventiva trimestral", cor: "bg-safety-green" },
            { tag: "BB-014", texto: "Vibração acima do alerta", cor: "bg-safety-yellow" },
          ].map((linha) => (
            <div key={linha.tag} className="flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-2">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${linha.cor}`} />
              <span className="text-[11px] font-semibold text-white">{linha.tag}</span>
              <span className="truncate text-[11px] text-navy-300">{linha.texto}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
