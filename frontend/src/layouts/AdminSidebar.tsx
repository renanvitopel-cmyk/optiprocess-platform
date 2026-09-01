import { NavLink } from "react-router-dom";
import { ShieldCheck, X } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { ADMIN_NAV } from "./adminNav";
import { company } from "../lib/companyInfo";

export function AdminSidebar({ mobileOpen, onCloseMobile }: { mobileOpen: boolean; onCloseMobile: () => void }) {
  const { user } = useAuth();
  const items = ADMIN_NAV.filter((item) => !user || item.roles.includes(user.role));

  const content = (
    <>
      <div className="flex h-16 items-center gap-2 px-5 font-bold text-white">
        <ShieldCheck className="h-6 w-6 text-safety-yellow" />
        {company.name}
        <button type="button" className="ml-auto text-navy-300 lg:hidden" onClick={onCloseMobile} aria-label="Fechar menu">
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex flex-col gap-0.5 px-3 py-4">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/gestao"}
            onClick={onCloseMobile}
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
      </nav>
    </>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 bg-navy-950 lg:block">
        <div className="sticky top-0 h-screen overflow-y-auto">{content}</div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/60" onClick={onCloseMobile} />
          <aside className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-navy-950 shadow-xl">{content}</aside>
        </div>
      )}
    </>
  );
}
