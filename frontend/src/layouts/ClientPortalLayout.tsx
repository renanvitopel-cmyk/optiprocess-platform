import { useState } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { Menu, X, LogOut } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { getPortalNav } from "./portalNav";
import { clientDisplayName } from "../lib/format";
import { Logo } from "../components/Logo";

export function ClientPortalLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const portalNav = getPortalNav(user?.client?.contractedServices ?? []);

  const nav = (
    <nav className="flex flex-col gap-0.5 px-3 py-4">
      {portalNav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/portal" || item.exact}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive ? "bg-navy-800 text-safety-yellow" : "text-navy-200 hover:bg-navy-800/60 hover:text-white"
            }`
          }
        >
          <item.icon className="h-4.5 w-4.5 shrink-0" />
          {item.label}
        </NavLink>
      ))}
      <button
        type="button"
        onClick={() => logout()}
        className="mt-4 flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium text-red-300 hover:bg-navy-800/60"
      >
        <LogOut className="h-4.5 w-4.5" /> Sair
      </button>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden w-64 shrink-0 bg-navy-950 lg:block">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <Link to="/portal" className="flex h-16 items-center px-5" aria-label="OptiProcess - portal do cliente">
            <Logo variant="light" size="sm" />
          </Link>
          {nav}
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-navy-950 shadow-xl">
            <div className="flex h-16 items-center px-5">
              <Logo variant="light" size="sm" />
              <button type="button" className="ml-auto text-navy-300" onClick={() => setMobileOpen(false)} aria-label="Fechar menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-gray-200 bg-white px-4 sm:px-6">
          <button type="button" className="text-graphite-600 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1">
            <p className="text-sm font-semibold text-navy-900">{clientDisplayName(user?.client)}</p>
            <p className="text-xs text-graphite-500">Portal do cliente</p>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
