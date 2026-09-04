import { Link } from "react-router-dom";
import { Tags, Factory, Workflow, Cog, Wallet, ChevronRight, ListChecks, OctagonPause, LayoutTemplate, HardHat, ClipboardPlus } from "lucide-react";
import { PageHeader } from "../../../components/PageHeader";
import { useCmms } from "../../../lib/cmms";

/** Ponto unico de entrada dos cadastros de apoio do CMMS. Em vez de cada catalogo virar
 * um item de menu (o menu ficava enorme e misturava operacao com configuracao), tudo que
 * e' "configura uma vez e usa sempre" fica aqui, agrupado por assunto. */
export default function TechnicalCatalogsHub() {
  const { assetsBase, base, laborBase } = useCmms();

  const groups = [
    {
      title: "Estrutura de ativos",
      description: "Como a fabrica e' organizada - preencha antes de cadastrar os equipamentos.",
      items: [
        { to: `${assetsBase}/tipos`, icon: Tags, title: "Tipos de ativo", description: "Nivel na hierarquia (Planta, Maquina, Subconjunto, Parte...)" },
        { to: `${assetsBase}/plantas`, icon: Factory, title: "Plantas", description: "Unidades/fabricas da empresa" },
        { to: `${assetsBase}/areas`, icon: Workflow, title: "Areas", description: "Areas/processos dentro de cada planta" },
        { to: `${assetsBase}/sistemas`, icon: Cog, title: "Sistemas", description: "Sistemas/maquinas dentro de cada area" },
        { to: `${assetsBase}/centros-custo`, icon: Wallet, title: "Centros de custo", description: "Classificacao contabil para apurar custo de manutencao" },
      ],
    },
    {
      title: "Manutencao",
      description: "Padroes que a operacao usa no dia a dia ao abrir e executar ordens.",
      items: [
        { to: `${base}/modelos-de-plano`, icon: LayoutTemplate, title: "Modelos de plano", description: "Planos reutilizaveis por familia de ativo" },
        { to: `${base}/falhas`, icon: ListChecks, title: "Codigos de falha", description: "Causas usadas nas ordens corretivas e no Pareto" },
        { to: `${base}/paradas`, icon: OctagonPause, title: "Motivos de parada", description: "Por que a maquina ficou parada durante o servico" },
      ],
    },
    {
      title: "Equipe",
      description: "Quem executa a manutencao - alimenta a programacao e o custo de mao de obra.",
      items: [
        { to: laborBase, icon: HardHat, title: "Mao de obra", description: "Equipe de manutencao, funcao e valor/hora" },
        { to: `${base}/solicitacoes`, icon: ClipboardPlus, title: "Solicitacoes de servico", description: "Fila de pedidos abertos pela operacao" },
      ],
    },
  ];

  return (
    <div>
      <PageHeader
        title="Cadastros"
        description="Configure uma vez e use sempre - estrutura de ativos, padroes de manutencao e equipe"
        breadcrumbs={[{ label: "RLP Maintenance CMMS", to: base }, { label: "Cadastros" }]}
      />

      <div className="space-y-8">
        {groups.map((group) => (
          <section key={group.title}>
            <h2 className="font-semibold text-navy-900">{group.title}</h2>
            <p className="mb-3 text-sm text-graphite-500">{group.description}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {group.items.map((item) => (
                <Link key={item.to} to={item.to} className="card flex items-center gap-4 p-5 transition-shadow hover:shadow-md">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-navy-900">{item.title}</h3>
                    <p className="text-sm text-graphite-500">{item.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-graphite-400" />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
