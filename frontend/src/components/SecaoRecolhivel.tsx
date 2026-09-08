import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

/**
 * Secao recolhivel - o que e' opcional fica fora do caminho.
 *
 * Um formulario mostra primeiro o que ele exige. Campo opcional aberto junto compete pela
 * atencao com o obrigatorio e faz a tela parecer mais longa do que o trabalho realmente e';
 * recolhido, ele continua a um clique de quem precisa dele.
 */
export function SecaoRecolhivel({
  titulo,
  dica,
  children,
  abertaPorPadrao = false,
}: {
  titulo: string;
  dica?: string;
  children: ReactNode;
  abertaPorPadrao?: boolean;
}) {
  const [aberta, setAberta] = useState(abertaPorPadrao);
  return (
    <div className="rounded-lg border border-gray-200">
      <button
        type="button"
        onClick={() => setAberta((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-graphite-700 hover:bg-gray-50"
      >
        {aberta ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        {titulo}
        {dica && <span className="ml-auto text-xs font-normal text-graphite-400">{dica}</span>}
      </button>
      {aberta && <div className="space-y-4 border-t border-gray-100 p-4">{children}</div>}
    </div>
  );
}
