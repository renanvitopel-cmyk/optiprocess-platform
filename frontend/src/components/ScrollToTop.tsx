import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * O React Router mantem a posicao do scroll ao trocar de rota, o que fazia uma
 * pagina nova abrir no meio/fim (ex.: ir de "Servicos" para o detalhe de um servico).
 * Este componente leva a janela para o topo a cada mudanca de caminho.
 *
 * Navegacoes com ancora (#secao) e o botao voltar/avancar do navegador sao
 * preservados: so reposiciona quando a acao e uma navegacao nova (PUSH) sem hash.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname, hash]);

  return null;
}
