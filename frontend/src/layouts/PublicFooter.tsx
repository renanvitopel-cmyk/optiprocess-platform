import { Link } from "react-router-dom";
import { MapPin, Phone, Mail } from "lucide-react";
import { company, serviceLines } from "../lib/companyInfo";
import { Logo } from "../components/Logo";

export function PublicFooter() {
  return (
    <footer className="border-t border-navy-900/10 bg-navy-950 text-navy-100">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo variant="light" size="lg" />
          <p className="mt-4 text-sm text-navy-300">{company.fullName}</p>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-200">Serviços</h3>
          <ul className="space-y-2 text-sm text-navy-300">
            {serviceLines.map((s) => (
              <li key={s.slug}>
                <Link to={`/servicos/${s.slug}`} className="hover:text-safety-yellow">
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-200">Institucional</h3>
          <ul className="space-y-2 text-sm text-navy-300">
            <li>
              <Link to="/empresa" className="hover:text-safety-yellow">Sobre a empresa</Link>
            </li>
            <li>
              <Link to="/produtos" className="hover:text-safety-yellow">Produtos</Link>
            </li>
            <li>
              <Link to="/validar-certificado" className="hover:text-safety-yellow">Validar certificado</Link>
            </li>
            <li>
              <Link to="/orcamento" className="hover:text-safety-yellow">Solicitar orçamento</Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-200">Contato</h3>
          <ul className="space-y-2.5 text-sm text-navy-300">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-safety-yellow" /> {company.address}
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-safety-yellow" /> {company.phoneDisplay}
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-safety-yellow" /> {company.email}
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-navy-400">
        © {new Date().getFullYear()} {company.name}. Todos os direitos reservados.
      </div>
    </footer>
  );
}
