import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Droplets, Plus } from "lucide-react";
import { listLubricationPoints } from "../api/lubrication";
import { formatDate } from "../lib/format";
import { EmptyState } from "./EmptyState";
import { METODOS_DE_LUBRIFICACAO } from "../lib/maintenanceLabels";


interface Props {
  instrumentId: string;
  clientId?: string;
  /** Prefixo das rotas do portal/gestao ("/portal" ou "/gestao"). */
  raiz: string;
}

/**
 * Os pontos de lubrificacao deste ativo, na propria ficha dele.
 *
 * A lubrificacao ja apontava para o ativo no banco, mas so era visivel numa tela a parte:
 * quem abria a ficha de uma maquina nao tinha como saber se ela tinha ponto, qual graxa
 * leva ou quando vence. Aqui a arvore de lubrificacao aparece pendurada na arvore
 * principal, que e' onde as pessoas procuram.
 */
export function AssetLubricationCard({ instrumentId, clientId, raiz }: Props) {
  const { data } = useQuery({
    queryKey: ["pontos-do-ativo", instrumentId],
    queryFn: () => listLubricationPoints({ instrumentId, clientId, pageSize: 50 }),
    enabled: !!instrumentId,
  });

  const pontos = data?.items ?? [];
  const novoPonto = `${raiz}/lubrificacao/pontos?instrumentId=${instrumentId}&novo=1`;

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold text-navy-900">
          <Droplets className="h-5 w-5 text-navy-600" /> Pontos de lubrificacao
        </h2>
        <Link className="btn-outline text-sm" to={novoPonto}>
          <Plus className="h-4 w-4" /> Adicionar ponto
        </Link>
      </div>

      {pontos.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            title="Nenhum ponto neste ativo"
            description="Cadastre o ponto para este ativo entrar nas rotas de lubrificacao."
          />
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-graphite-500">
              <tr>
                <th className="px-3 py-2">Ponto</th>
                <th className="px-3 py-2">Lubrificante</th>
                <th className="px-3 py-2">Quantidade</th>
                <th className="px-3 py-2">Metodo</th>
                <th className="px-3 py-2">A cada</th>
                <th className="px-3 py-2">Proxima</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pontos.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2">
                    <span className="font-medium text-navy-900">{p.name}</span>
                    <span className="block text-xs text-graphite-400">
                      {p.code}
                      {p.component ? ` - ${p.component}` : ""}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-graphite-700">{p.lubricant?.sparePart?.name ?? "-"}</td>
                  <td className="px-3 py-2 text-graphite-700">
                    {p.quantityPerApplication} {p.lubricant?.sparePart?.unit ?? ""}
                  </td>
                  <td className="px-3 py-2 text-graphite-700">{METODOS_DE_LUBRIFICACAO[p.method] ?? p.method}</td>
                  <td className="px-3 py-2 text-graphite-700">{p.frequencyDays} dias</td>
                  <td className="px-3 py-2 text-graphite-700">{p.nextDueAt ? formatDate(p.nextDueAt) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
