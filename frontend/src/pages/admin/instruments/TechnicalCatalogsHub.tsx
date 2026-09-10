import { Link } from "react-router-dom";
import { Tags, ChevronRight } from "lucide-react";
import { PageHeader } from "../../../components/PageHeader";
import { useAuth } from "../../../auth/AuthContext";

/** Ponto unico de entrada dos cadastros de apoio dos Ativos. */
export default function TechnicalCatalogsHub() {
  const { user } = useAuth();
  const base = user?.role === "CLIENT" || user?.role === "CLIENT_PLANNER" ? "/portal/instrumentos" : "/gestao/instrumentos";

  const groups = [
    {
      title: "Estrutura de ativos",
      description: "Catalogo usado no cadastro dos ativos.",
      items: [
        { to: `${base}/tipos`, icon: Tags, title: "Tipos de ativo", description: "Catalogo de tipos usado no cadastro do ativo" },
      ],
    },
  ];

  return (
    <div>
      <PageHeader
        title="Cadastros tecnicos"
        description="Configure uma vez e use sempre"
        breadcrumbs={[{ label: "Ativos", to: base }, { label: "Cadastros tecnicos" }]}
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
