/**
 * Como o centro de custo aparece na tela: pelo NUMERO.
 *
 * O nome de um centro de custo costuma repetir o da area ("Linha 4"), e ai o seletor de
 * centro de custo dentro do cadastro da area mostrava "Linha 4" escolhendo "Linha 4" -
 * duas coisas diferentes com o mesmo rotulo. Quem identifica o centro de custo e' o numero;
 * o nome e' descricao.
 *
 * Registros antigos podem estar sem numero: nesse caso mostra o nome, porque um campo em
 * branco seria pior do que um rotulo ambiguo.
 */
export function rotuloDoCentroDeCusto(cc?: { name?: string | null; code?: string | null } | null): string {
  if (!cc) return "-";
  if (cc.code?.trim()) return cc.code.trim();
  return cc.name?.trim() || "-";
}

/** Versao com a descricao ao lado, para telas que tem espaco (listas, fichas). */
export function centroDeCustoComDescricao(cc?: { name?: string | null; code?: string | null } | null): string {
  if (!cc) return "-";
  const numero = cc.code?.trim();
  const nome = cc.name?.trim();
  if (numero && nome) return `${numero} - ${nome}`;
  return numero || nome || "-";
}

/**
 * Area e centro de custo num rotulo so: "Linha 3 - CC 108".
 *
 * Sao um cadastro so - o centro de custo existe por causa da area e vem junto dela para
 * todo ativo do galho. Mostrar em dois campos separados fazia parecer que dava para
 * escolher um sem o outro, e era exatamente o que confundia no cadastro do ativo.
 */
export function areaComCentroDeCusto(
  area?: { name?: string | null } | null,
  centro?: { name?: string | null; code?: string | null } | null,
): string {
  const nomeDaArea = area?.name?.trim();
  const numero = centro?.code?.trim() || centro?.name?.trim();
  if (nomeDaArea && numero) return `${nomeDaArea} - CC ${numero}`;
  if (nomeDaArea) return `${nomeDaArea} - sem centro de custo`;
  return numero ? `CC ${numero}` : "-";
}
