import { Link } from "react-router-dom";
import { Tags, Factory, Workflow, Cog, Wallet, ChevronRight } from "lucide-react";
import { PageHeader } from "../../../components/PageHeader";
import { useCmms } from "../../../lib/cmms";

/** Hub central dos catalogos usados no cadastro de ativo (Planta/Area/Sistema/Tipo/Centro
 * de custo) - ponto unico de entrada em vez de espalhar um botao por catalogo na lista
 * de ativos, ja que a tendencia e' esta lista crescer com o tempo. */
export default function TechnicalCatalogsHub() {
  const { assetsBase } = useCmms();

  const items = [
    { to: `${assetsBase}/tipos`, icon: Tags, title: "Tipos de ativo", description: "Nivel do ativo na hierarquia (Planta, Maquina, Subconjunto, Parte...)" },
    { to: `${assetsBase}/plantas`, icon: Factory, title: "Plantas", description: "Unidades/fabricas da empresa" },
    { to: `${assetsBase}/areas`, icon: Workflow, title: "Areas", description: "Areas/processos dentro de cada planta" },
    { to: `${assetsBase}/sistemas`, icon: Cog, title: "Sistemas", description: "Sistemas/maquinas dentro de cada area" },
    { to: `${assetsBase}/centros-custo`, icon: Wallet, title: "Centros de custo", description: "Classificacao contabil para apurar custo de manutencao" },
  ];

  return (
    <div>
      <PageHeader
        title="Cadastros tecnicos"
        description="Catalogos usados no cadastro de ativo - organize antes de vincular aos equipamentos"
        breadcrumbs={[{ label: "Ativos", to: assetsBase }, { label: "Cadastros tecnicos" }]}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
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
    </div>
  );
}
