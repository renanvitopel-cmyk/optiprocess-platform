/** Os formatos que o servidor aceita em foto (middleware uploadImage). */
export const FORMATOS_DE_IMAGEM = ["image/jpeg", "image/png", "image/webp"];

const TAMANHO_MAXIMO = 15 * 1024 * 1024;

/**
 * Confere a imagem antes de enviar. Devolve a mensagem do problema, ou null se estiver ok.
 * Existe porque a foto tirada num iPhone vem em HEIC: sem esta conferencia ela so falhava
 * la no fim do envio, com uma mensagem que nao dizia o que fazer.
 */
export function problemaNaImagem(arquivo: File): string | null {
  if (!FORMATOS_DE_IMAGEM.includes(arquivo.type)) {
    return "Formato nao aceito. Envie a foto em JPG, PNG ou WEBP.";
  }
  if (arquivo.size > TAMANHO_MAXIMO) {
    return "A foto passa de 15 MB. Reduza a imagem antes de enviar.";
  }
  return null;
}
