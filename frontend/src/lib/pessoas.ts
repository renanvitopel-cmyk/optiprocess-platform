/** Iniciais para quem ainda nao tem foto - duas letras bastam para diferenciar numa lista,
 * e um circulo com iniciais mantem o alinhamento que um espaco vazio quebraria. */
export function iniciaisDe(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}
