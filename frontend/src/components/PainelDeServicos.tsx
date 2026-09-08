import { BadgeCheck, FileText, Wrench, Zap } from "lucide-react";

/**
 * O visual do hero da home: o que a OptiProcess PRESTA.
 *
 * Antes ali ficava o painel do CMMS, que fala de um software - enquanto o texto ao lado
 * fala de manutencao eletrica, calibracao rastreavel e laudos. Imagem e texto contando
 * historias diferentes fazem o visitante decidir qual dos dois e' o negocio. Este cartao
 * mostra as quatro frentes do texto, com o certificado em destaque porque a rastreabilidade
 * e' o que diferencia a calibracao.
 *
 * Desenhado em CSS, como o outro: nao envelhece com a interface e nao expoe dado de
 * cliente. Os numeros sao ilustrativos.
 */
export function PainelDeServicos({ className = "" }: { className?: string }) {
  const frentes = [
    { icone: Zap, titulo: "Manutenção elétrica", detalhe: "Predial e industrial · painéis e motores" },
    { icone: Wrench, titulo: "Assistência técnica", detalhe: "Inversores, CLPs e instrumentação" },
    { icone: FileText, titulo: "Laudos técnicos", detalhe: "Documentação com responsável técnico" },
  ];

  return (
    <div className={`relative ${className}`} aria-hidden="true">
      <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-safety-yellow/10 via-transparent to-safety-green/10 blur-2xl" />

      <div className="relative rounded-2xl border border-white/10 bg-navy-900/80 p-5 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-navy-400">Serviço técnico</p>
            <p className="text-sm font-bold text-white">OptiProcess</p>
          </div>
          <span className="rounded-full bg-safety-green/15 px-2 py-0.5 text-[10px] font-semibold text-safety-green">
            ● Atendimento em Sorocaba e região
          </span>
        </div>

        {/* O certificado em destaque: e' o que a calibracao entrega, e o que o cliente
            guarda para a auditoria. */}
        <div className="mt-4 rounded-lg border border-safety-yellow/30 bg-safety-yellow/5 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-safety-yellow">
                <BadgeCheck className="h-3.5 w-3.5" /> Certificado de calibração
              </p>
              <p className="mt-1 truncate text-sm font-bold text-white">CAL-2026-0184</p>
              <p className="truncate text-[11px] text-navy-300">Manômetro 0-10 bar · TAG PI-204</p>
            </div>
            <span className="shrink-0 rounded-full bg-safety-green/15 px-2 py-0.5 text-[10px] font-semibold text-safety-green">
              Válido
            </span>
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-white/10 pt-2.5">
            {[
              { rotulo: "Rastreável", valor: "RBC / INMETRO" },
              { rotulo: "Emissão", valor: "12/02/2026" },
              { rotulo: "Próxima", valor: "12/02/2027" },
            ].map((campo) => (
              <div key={campo.rotulo}>
                <p className="text-[9px] uppercase tracking-wide text-navy-400">{campo.rotulo}</p>
                <p className="mt-0.5 truncate text-[11px] font-semibold text-white">{campo.valor}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          {frentes.map((frente) => {
            const Icone = frente.icone;
            return (
              <div key={frente.titulo} className="flex items-center gap-2.5 rounded-lg bg-white/5 px-2.5 py-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-safety-yellow">
                  <Icone className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-semibold text-white">{frente.titulo}</span>
                  <span className="block truncate text-[11px] text-navy-300">{frente.detalhe}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
