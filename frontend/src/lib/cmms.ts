import { useAuth } from "../auth/AuthContext";

/**
 * As telas do CMMS (planos, ordens, codigos de falha, almoxarifado) sao as mesmas para a
 * equipe interna e para o cliente - muda o prefixo das rotas e o fato de o cliente estar
 * sempre restrito a propria empresa (o backend forca o clientId, entao os seletores de
 * cliente somem no portal).
 */
export function useCmms() {
  const { user } = useAuth();
  // O Solicitante tambem esta preso a propria empresa (o backend forca o clientId), entao
  // as telas compartilhadas se comportam como no portal do cliente. O que ele NAO faz e'
  // gerenciar - isso fica em canManage abaixo.
  const isClient = user?.role === "CLIENT" || user?.role === "REQUESTER";

  return {
    isClient,
    // O CMMS e' do cliente: quem gerencia e' a equipe dele. O ADMIN da OptiProcess entra
    // por acesso master (suporte/administracao da plataforma); TECHNICIAN e COMMERCIAL
    // cuidam dos servicos prestados pela OptiProcess, nao da manutencao interna do cliente.
    canManage: user?.role === "CLIENT" || user?.role === "ADMIN",
    ownClientId: user?.clientId ?? undefined,
    base: isClient ? "/portal/manutencao" : "/gestao/manutencao",
    assetsBase: isClient ? "/portal/instrumentos" : "/gestao/instrumentos",
    partsBase: isClient ? "/portal/almoxarifado" : "/gestao/manutencao/almoxarifado",
    laborBase: isClient ? "/portal/manutencao/mao-de-obra" : "/gestao/manutencao/mao-de-obra",
  };
}
