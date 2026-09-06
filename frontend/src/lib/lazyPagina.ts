/* eslint-disable @typescript-eslint/no-explicit-any */
import { lazy, type ComponentType } from "react";

const CHAVE = "optiprocess-recarregou-por-modulo-antigo";

/**
 * `lazy` que sobrevive a um deploy.
 *
 * Cada tela e' um arquivo separado com o nome carimbado pelo conteudo
 * (`WorkOrderDetail-B495G8kj.js`). Quando sai uma versao nova, os arquivos antigos deixam
 * de existir no servidor - e a aba que ficou aberta desde antes ainda pede o nome antigo.
 * O pedido volta 404, o React nao monta a rota, e a tela simplesmente nao abre: clicar no
 * menu nao faz nada. Recarregar resolve, mas so quem sabe disso resolve.
 *
 * Aqui a falha de carregamento recarrega a pagina uma vez sozinha, que e' o que traz o
 * index.html novo com os nomes certos. A marca fica na sessao pra um erro real (rede fora,
 * arquivo corrompido) nao virar recarga em loop.
 */
export function lazyPagina<T extends ComponentType<any>>(carregar: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const modulo = await carregar();
      sessionStorage.removeItem(CHAVE);
      return modulo;
    } catch (erro) {
      if (!sessionStorage.getItem(CHAVE)) {
        sessionStorage.setItem(CHAVE, "1");
        window.location.reload();
        // Segura o carregamento enquanto a pagina recarrega, pra nao piscar uma tela de erro.
        return new Promise<{ default: T }>(() => {});
      }
      throw erro;
    }
  });
}
