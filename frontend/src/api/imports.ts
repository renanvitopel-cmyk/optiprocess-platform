import { api } from "./client";
import type { ModoDeImportacao, ResultadoDaImportacao } from "./types";

/** Modelo .xlsx com uma aba por cadastro e as instrucoes de preenchimento. */
export async function baixarModeloDeImportacao(clientId?: string): Promise<Blob> {
  const { data } = await api.get("/importacao/modelo", { params: { clientId }, responseType: "blob" });
  return data as Blob;
}

/** Confere a planilha sem gravar nada - e' o que a tela mostra antes de confirmar. */
export async function simularImportacao(file: File, clientId?: string, modo: ModoDeImportacao = "ignorar"): Promise<ResultadoDaImportacao> {
  const form = new FormData();
  form.append("file", file);
  if (clientId) form.append("clientId", clientId);
  form.append("modo", modo);
  const { data } = await api.post<ResultadoDaImportacao>("/importacao/simular", form);
  return data;
}

export async function confirmarImportacao(file: File, clientId?: string, modo: ModoDeImportacao = "ignorar"): Promise<ResultadoDaImportacao> {
  const form = new FormData();
  form.append("file", file);
  if (clientId) form.append("clientId", clientId);
  form.append("modo", modo);
  const { data } = await api.post<ResultadoDaImportacao>("/importacao/confirmar", form);
  return data;
}
