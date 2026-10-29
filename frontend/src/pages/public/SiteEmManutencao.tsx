import { Link } from "react-router-dom";
import { BadgeCheck, LogIn, Mail, MessageCircle, Phone, Wrench } from "lucide-react";
import { LogoFull } from "../../components/Logo";
import { buildWhatsAppLink } from "../../components/WhatsAppButton";
import { company } from "../../lib/companyInfo";

/**
 * Aparece no lugar do site publico enquanto SITE_EM_MANUTENCAO=true no servidor. Nao
 * fecha a porta para quem ja e' cliente: o acesso ao sistema e a validacao de certificado
 * (o QR Code impresso nos certificados aponta para ela) continuam a um clique.
 */
export function SiteEmManutencao({ whatsappNumber }: { whatsappNumber?: string }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-navy-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(0,96,192,0.35),transparent_50%),radial-gradient(circle_at_10%_90%,rgba(245,180,0,0.12),transparent_45%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:44px_44px]" />

      <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-5 py-16 text-center">
        <span className="rounded-2xl bg-white px-6 py-4 shadow-xl">
          <LogoFull variant="dark" className="h-20 sm:h-24" />
        </span>

        <span className="mt-10 inline-flex items-center gap-2 rounded-full border border-safety-yellow/30 bg-safety-yellow/10 px-3 py-1 text-xs font-semibold text-safety-yellow">
          <Wrench className="h-3.5 w-3.5" /> Em manutenção
        </span>
        <h1 className="mt-5 text-4xl font-extrabold leading-tight text-white sm:text-5xl">Site em manutenção</h1>
        <p className="mt-4 max-w-xl text-lg text-navy-200">
          Estamos preparando um site novo para você. Enquanto isso, nosso atendimento continua normalmente.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {whatsappNumber && (
            <a
              href={buildWhatsAppLink(whatsappNumber, "Olá! Gostaria de falar com a OptiProcess.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-safety-green px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-safety-green-dark"
            >
              <MessageCircle className="h-4 w-4" /> Falar no WhatsApp
            </a>
          )}
          <Link
            to="/entrar"
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <LogIn className="h-4 w-4" /> Acessar o sistema
          </Link>
          <Link
            to="/validar-certificado"
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <BadgeCheck className="h-4 w-4" /> Validar certificado
          </Link>
        </div>

        <div className="mt-10 flex flex-col items-center gap-2 text-sm text-navy-200 sm:flex-row sm:gap-6">
          <a href={`tel:+55${company.phoneDisplay.replace(/\D/g, "")}`} className="inline-flex items-center gap-2 hover:text-white">
            <Phone className="h-4 w-4 text-safety-yellow" /> {company.phoneDisplay}
          </a>
          <a href={`mailto:${company.email}`} className="inline-flex items-center gap-2 hover:text-white">
            <Mail className="h-4 w-4 text-safety-yellow" /> {company.email}
          </a>
        </div>
      </main>

      <footer className="relative px-5 pb-6 text-center text-xs text-navy-400">
        {company.fullName} · {company.address}
      </footer>
    </div>
  );
}
