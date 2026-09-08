/**
 * Recorte estilizado do painel do RLP Maintenance CMMS.
 *
 * Desenhado em CSS, nao e' captura de tela: nao envelhece quando a interface muda e nao
 * expoe dado de cliente nenhum. Vive na pagina do software, que e' onde ele diz o que o
 * produto faz - na home ele falava de um produto que o texto ao lado nem citava.
 */
export function PainelDoCmms({ className = "" }: { className?: string }) {
  const barras = [38, 52, 44, 68, 58, 80, 72];

  return (
    <div className={`relative ${className}`} aria-hidden="true">
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
            { tag: "RD-007", texto: "Lubrificação da rota semanal", cor: "bg-navy-300" },
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
