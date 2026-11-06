import { Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PublicHeader } from "./PublicHeader";
import { PublicFooter } from "./PublicFooter";
import { WhatsAppButton } from "../components/WhatsAppButton";
import { getPublicConfig } from "../api/publicApi";
import { SiteEmManutencao } from "../pages/public/SiteEmManutencao";

export function PublicLayout() {
  const { pathname } = useLocation();
  const { data: config, isLoading } = useQuery({ queryKey: ["public-config"], queryFn: getPublicConfig, staleTime: Infinity });

  // Validacao de certificado fica fora da manutencao: o QR Code dos certificados ja
  // emitidos aponta para ela e precisa continuar respondendo.
  const paginaSempreAberta = pathname.startsWith("/validar-certificado");
  // A manutencao fecha so o dominio oficial (optiprocess.com.br e www). Pelo endereco do
  // Render (optiprocess-platform.onrender.com) o site novo continua visivel para conferir
  // antes de liberar o .com.br.
  const dominioOficial = /(^|\.)optiprocess\.com\.br$/i.test(window.location.hostname);
  if (dominioOficial && !paginaSempreAberta) {
    // Sem a config ainda, nao mostra o site por um instante so' para trocar pela
    // manutencao logo depois.
    if (isLoading) return <div className="min-h-screen bg-navy-950" />;
    if (config?.maintenance) return <SiteEmManutencao whatsappNumber={config.whatsappNumber} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PublicHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
      <WhatsAppButton />
    </div>
  );
}
