import { useEffect, useState } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { Menu, X, LogOut } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { getPortalNav } from "./portalNav";
import { CmmsLogo } from "../components/CmmsLogo";
import { clientDisplayName } from "../lib/format";
import { Logo } from "../components/Logo";

const COLLAPSE_KEY = "optiprocess-portal-sidebar-collapsed";

export function ClientPortalLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  // Preferencia por dispositivo (aberto/fechado) - guardada so no navegador, nao no
  // perfil do usuario, entao cada computador/celular lembra do proprio jeito.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const { user, logout } = useAuth();
  const contractedServices = user?.client?.contractedServices ?? [];
  const portalNav = getPortalNav(contractedServices, user?.role);
  // Quem assinou o CMMS esta usando o RLP Maintenance - a marca do portal dele e' a do
  // produto. Cliente que so tem servicos da OptiProcess (calibracao, laudos) continua
  // vendo a marca da OptiProcess, que e' quem presta o servico.
  const usesCmms = contractedServices.includes("CMMS_MAINTENANCE");
  const brand = (size: "sm" | "md") =>
    usesCmms ? <CmmsLogo variant="light" size={size} /> : <Logo variant="light" size={size} />;

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {
      // Sem localStorage disponivel (aba anonima, etc.) - so nao persiste, sem quebrar.
    }
  }, [collapsed]);

  const nav = (isCollapsed: boolean) => (
    <nav className="flex flex-col gap-0.5 px-3 py-4">
      {portalNav.map((section, index) => (
        <div key={section.title ?? `section-${index}`} className={index > 0 ? "mt-4" : ""}>
          {section.title &&
            (isCollapsed ? (
              <div className="mx-3 mb-1 border-t border-navy-800" />
            ) : (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-navy-400">{section.title}</p>
            ))}
          <div className="flex flex-col gap-0.5">
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/portal" || item.exact}
                onClick={() => setMobileOpen(false)}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${isCollapsed ? "justify-center" : ""} ${
                    isActive ? "bg-navy-800 text-safety-yellow" : "text-navy-200 hover:bg-navy-800/60 hover:text-white"
                  }`
                }
              >
                <item.icon className="h-4.5 w-4.5 shrink-0" />
                {!isCollapsed && item.label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => logout()}
        title={isCollapsed ? "Sair" : undefined}
        className={`mt-4 flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium text-red-300 hover:bg-navy-800/60 ${isCollapsed ? "justify-center" : ""}`}
      >
        <LogOut className="h-4.5 w-4.5 shrink-0" /> {!isCollapsed && "Sair"}
      </button>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className={`hidden shrink-0 bg-navy-950 transition-[width] duration-150 lg:block ${collapsed ? "w-16" : "w-64"}`}>
        <div className="sticky top-0 h-screen overflow-y-auto overflow-x-hidden">
          <div className={`flex h-16 items-center ${collapsed ? "justify-center px-2" : "px-5"}`}>
            {!collapsed && (
              <Link to="/portal" aria-label={usesCmms ? "RLP Maintenance" : "OptiProcess - portal do cliente"}>
                {brand("sm")}
              </Link>
            )}
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className={`text-navy-300 hover:text-white ${collapsed ? "" : "ml-auto"}`}
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
              title={collapsed ? "Expandir menu" : "Recolher menu"}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
          {nav(collapsed)}
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-navy-950 shadow-xl">
            <div className="flex h-16 items-center px-5">
              {brand("sm")}
              <button type="button" className="ml-auto text-navy-300" onClick={() => setMobileOpen(false)} aria-label="Fechar menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav(false)}
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
            <p className="text-xs text-graphite-500">{usesCmms ? "RLP Maintenance" : "Portal do cliente"}</p>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
