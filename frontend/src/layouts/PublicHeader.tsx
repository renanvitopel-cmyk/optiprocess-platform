import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X, ChevronDown, ShoppingCart } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { homeForRole } from "../auth/ProtectedRoute";
import { useCart } from "../cart/CartContext";
import { Logo } from "../components/Logo";

const NAV_LINKS = [
  { to: "/", label: "Início" },
  { to: "/empresa", label: "Empresa" },
  { to: "/servicos", label: "Serviços" },
  { to: "/servicos/rlp-maintenance-cmms", label: "Software de Manutenção" },
  { to: "/produtos", label: "Produtos" },
  { to: "/contato", label: "Contato" },
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { totalItems } = useCart();

  return (
    <header className="sticky top-0 z-30 border-b border-navy-900/10 bg-navy-950 text-white">
      <div className="container-page flex h-16 items-center justify-between">
        <Link to="/" aria-label="OptiProcess - página inicial">
          <Logo variant="light" size="md" />
        </Link>

        <nav className="hidden items-center gap-5 text-sm font-medium xl:flex">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                `transition-colors hover:text-safety-yellow ${isActive ? "text-safety-yellow" : "text-navy-100"}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 xl:flex">
          <Link to="/carrinho" className="relative text-navy-100 hover:text-safety-yellow" aria-label="Carrinho">
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-safety-yellow text-[10px] font-bold text-navy-950">
                {totalItems}
              </span>
            )}
          </Link>
          <Link to="/orcamento" className="btn-primary btn-sm">
            Solicitar orçamento
          </Link>
          {user ? (
            <Link to={homeForRole(user.role)} className="btn-outline btn-sm border-white/30 bg-transparent text-white hover:bg-white/10">
              Minha área <ChevronDown className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <Link to="/entrar" className="btn-outline btn-sm border-white/30 bg-transparent text-white hover:bg-white/10">
              Entrar
            </Link>
          )}
        </div>

        <button
          type="button"
          className="text-white xl:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-navy-950 xl:hidden">
          <nav className="container-page flex flex-col gap-1 py-3 text-sm font-medium">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                onClick={() => setOpen(false)}
                className={({ isActive }) => `rounded-md px-3 py-2.5 ${isActive ? "bg-white/10 text-safety-yellow" : "text-navy-100"}`}
              >
                {link.label}
              </NavLink>
            ))}
            <Link to="/carrinho" onClick={() => setOpen(false)} className="rounded-md px-3 py-2.5 text-navy-100">
              Carrinho {totalItems > 0 && `(${totalItems})`}
            </Link>
            <Link to="/orcamento" onClick={() => setOpen(false)} className="btn-primary btn-sm mt-2 justify-center">
              Solicitar orçamento
            </Link>
            <Link
              to={user ? homeForRole(user.role) : "/entrar"}
              onClick={() => setOpen(false)}
              className="btn-outline btn-sm justify-center border-white/30 bg-transparent text-white hover:bg-white/10"
            >
              {user ? "Minha área" : "Entrar"}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
