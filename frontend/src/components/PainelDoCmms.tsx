/**
 * Mockup fiel a tela real do RLP Maintenance CMMS - o painel, com a barra lateral.
 *
 * Antes era um cartao flutuante generico (KPIs inventados, sem parecido nenhum com o
 * produto). O pedido foi por "algo real": esta versao reproduz a propria interface -
 * sidebar navy com as secoes (Operacional, Lubrificacao, Gestao), o cabecalho com o plano
 * contratado, os atalhos do painel e os indicadores - dentro de uma moldura de navegador,
 * para deixar claro que e' a tela do sistema, e nao uma ilustracao solta.
 *
 * Continua sendo HTML/CSS, nao uma captura de tela: nao envelhece pixel a pixel quando o
 * layout muda, e os dados mostrados (nomes, numeros) sao ilustrativos - nenhum cliente
 * real aparece aqui.
 */
export function PainelDoCmms({ className = "" }: { className?: string }) {
  const acoes = ["Solicitações", "Ordens", "Programação", "Kanban", "Planos preventivos", "Ativos", "Almoxarifado"];
  const kpis = [
    { rotulo: "MTTR", valor: "3,2h" },
    { rotulo: "MTBF", valor: "412h" },
    { rotulo: "Disponibilidade", valor: "97,4%" },
    { rotulo: "Cumprimento do plano", valor: "88%" },
  ];
  const navSecoes = ["Operacional", "Lubrificação", "Gestão"];

  return (
    <div className={`relative ${className}`} aria-hidden="true">
      <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-safety-yellow/10 via-transparent to-safety-green/10 blur-2xl" />

      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-navy-950 shadow-2xl">
        {/* barra de janela: deixa claro que e' a tela do sistema rodando no navegador */}
        <div className="flex items-center gap-1.5 border-b border-white/10 bg-navy-900 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-white/20" />
          <span className="h-2 w-2 rounded-full bg-white/20" />
          <span className="h-2 w-2 rounded-full bg-white/20" />
          <span className="ml-2 truncate rounded bg-white/5 px-2 py-0.5 text-[9px] text-navy-400">
            app.rlpmaintenance.com.br
          </span>
        </div>

        <div className="flex">
          {/* sidebar */}
          <div className="hidden w-32 shrink-0 border-r border-white/10 bg-navy-950 p-2.5 sm:block">
            <div className="mb-3 flex items-center gap-1 px-0.5">
              <span className="text-[11px] font-extrabold leading-none text-white">RLP</span>
              <span className="text-[7px] font-medium leading-none text-navy-400">Maintenance</span>
            </div>
            <div className="rounded-md bg-white/10 px-2 py-1.5">
              <p className="text-[9px] font-semibold text-safety-yellow">Painel do CMMS</p>
            </div>
            <div className="mt-2.5 space-y-2">
              {navSecoes.map((s) => (
                <p key={s} className="truncate px-2 text-[9px] font-medium text-navy-300">
                  {s}
                </p>
              ))}
            </div>
          </div>

          {/* conteudo */}
          <div className="min-w-0 flex-1 bg-gray-50 p-3.5">
            {/* topo: empresa + plano, como na tela real */}
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[10px] font-bold text-navy-900">Sua empresa</p>
                <p className="truncate text-[8px] text-graphite-500">RLP Maintenance</p>
              </div>
              <span className="shrink-0 rounded-full border border-navy-200 bg-white px-1.5 py-0.5 text-[8px] font-medium text-navy-700">
                Advanced · 12/100
              </span>
            </div>

            <div className="mt-2.5 flex flex-wrap gap-1">
              {acoes.map((a, i) => (
                <span
                  key={a}
                  className={`truncate rounded-md border px-1.5 py-1 text-[8px] font-medium ${
                    i === 0
                      ? "border-safety-yellow bg-safety-yellow/10 text-safety-yellow-dark"
                      : "border-gray-200 bg-white text-graphite-600"
                  }`}
                >
                  {a}
                </span>
              ))}
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-1.5">
              {kpis.map((kpi) => (
                <div key={kpi.rotulo} className="rounded-lg border border-gray-200 bg-white p-2">
                  <p className="truncate text-[7px] uppercase tracking-wide text-graphite-400">{kpi.rotulo}</p>
                  <p className="mt-0.5 text-sm font-bold text-navy-900">{kpi.valor}</p>
                </div>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {[
                { rotulo: "Abertas", valor: "6", cor: "text-safety-yellow-dark" },
                { rotulo: "Em andamento", valor: "3", cor: "text-navy-700" },
                { rotulo: "Concluídas", valor: "24", cor: "text-safety-green-dark" },
              ].map((c) => (
                <div key={c.rotulo} className="rounded-lg bg-white/60 p-1.5 text-center">
                  <p className={`text-sm font-bold ${c.cor}`}>{c.valor}</p>
                  <p className="truncate text-[7px] text-graphite-500">{c.rotulo}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
