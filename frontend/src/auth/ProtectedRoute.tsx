import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { Role } from "../api/types";
import { FullPageSpinner } from "../components/Spinner";
import { TrocaDeSenhaObrigatoria } from "./TrocaDeSenhaObrigatoria";

interface ProtectedRouteProps {
  roles?: Role[];
}

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;

  if (!user) {
    return <Navigate to="/entrar" state={{ from: location.pathname }} replace />;
  }

  // Antes de qualquer permissao: senha provisoria nao entra em lugar nenhum. A API tambem
  // recusa, entao isto e' o caminho para frente, e nao so uma cortina sobre a tela.
  if (user.mustChangePassword) return <TrocaDeSenhaObrigatoria />;

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  return <Outlet />;
}

export function homeForRole(role: Role): string {
  // O Solicitante nao tem dashboard: mandar ele para /portal seria mandar para uma rota
  // que ele nao alcanca - e o redirecionamento entraria em laco.
  if (role === "REQUESTER") return "/portal/manutencao/solicitacoes";
  // O resto da equipe do cliente entra pelo portal - o que muda entre os perfis e' o que
  // cada um alcanca la dentro, nao o endereco.
  if (["CLIENT", "CLIENT_PLANNER", "CLIENT_TECHNICIAN"].includes(role)) return "/portal";
  return "/gestao";
}
