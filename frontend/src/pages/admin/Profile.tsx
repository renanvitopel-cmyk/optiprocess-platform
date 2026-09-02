import { useState } from "react";
import { KeyRound } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { PageHeader } from "../../components/PageHeader";
import { formatRole, clientDisplayName } from "../../lib/format";
import { ChangePasswordModal } from "../../components/ChangePasswordModal";

export default function Profile() {
  const { user } = useAuth();
  const [passwordOpen, setPasswordOpen] = useState(false);
  if (!user) return null;

  return (
    <div>
      <PageHeader title="Meu perfil" />
      <div className="card max-w-lg space-y-4 p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-navy-800 text-xl font-bold text-white">
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <p className="text-lg font-bold text-navy-900">{user.name}</p>
            <p className="text-sm text-graphite-500">{formatRole(user.role)}</p>
          </div>
        </div>
        <dl className="grid gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-graphite-400">E-mail</dt>
            <dd className="mt-0.5 text-sm font-medium text-graphite-800">{user.email}</dd>
          </div>
          {user.client && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-graphite-400">Empresa</dt>
              <dd className="mt-0.5 text-sm font-medium text-graphite-800">{clientDisplayName(user.client)}</dd>
            </div>
          )}
        </dl>
        <div className="border-t border-gray-100 pt-4">
          <button type="button" className="btn-outline" onClick={() => setPasswordOpen(true)}>
            <KeyRound className="h-4 w-4" /> Alterar minha senha
          </button>
        </div>
      </div>

      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </div>
  );
}
