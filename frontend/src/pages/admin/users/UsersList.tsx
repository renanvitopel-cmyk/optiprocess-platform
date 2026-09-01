import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, KeyRound, Info } from "lucide-react";
import { listUsers, resetUserPassword, updateUser } from "../../../api/users";
import type { Role, UserAccount } from "../../../api/types";
import { PageHeader } from "../../../components/PageHeader";
import { DataTable } from "../../../components/DataTable";
import { StatusBadge } from "../../../components/StatusBadge";
import { formatDateTime, formatRole } from "../../../lib/format";
import { UserFormModal } from "./UserFormModal";
import { RolesInfoModal } from "./RolesInfoModal";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";
import { Modal } from "../../../components/Modal";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "ADMIN", label: "Administrador" },
  { value: "TECHNICIAN", label: "Tecnico" },
  { value: "COMMERCIAL", label: "Comercial" },
  { value: "CLIENT", label: "Cliente" },
];

export default function UsersList() {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  const [role, setRole] = useState<Role | "">("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | undefined>();
  const [rolesOpen, setRolesOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["users", role, page],
    queryFn: () => listUsers({ role: role || undefined, page, pageSize: 15 }),
  });

  async function handleToggleActive(id: string, active: boolean) {
    try {
      await updateUser(id, { active: !active });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function handleResetPassword(id: string) {
    try {
      const password = await resetUserPassword(id);
      setTempPassword(password);
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  return (
    <div>
      <PageHeader
        title="Usuarios e perfis"
        description="Contas de acesso a gestao interna e ao portal do cliente"
        actions={
          <>
            <button className="btn-outline" onClick={() => setRolesOpen(true)}>
              <Info className="h-4 w-4" /> Perfis e permissoes
            </button>
            <button className="btn-primary" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Novo usuario
            </button>
          </>
        }
      />

      <div className="mb-4 max-w-xs">
        <select className="input" value={role} onChange={(e) => { setRole(e.target.value as Role | ""); setPage(1); }}>
          <option value="">Todos os perfis</option>
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <DataTable
        loading={isLoading}
        rows={data?.items ?? []}
        keyField={(u) => u.id}
        pagination={data}
        onPageChange={setPage}
        onRowClick={(u) => setEditingUser(u)}
        emptyTitle="Nenhum usuario cadastrado"
        columns={[
          { header: "Nome", accessor: (u) => <span className="font-medium text-navy-900">{u.name}</span> },
          { header: "E-mail", accessor: (u) => u.email },
          { header: "Perfil", accessor: (u) => formatRole(u.role) },
          { header: "Empresa", accessor: (u) => u.client?.tradeName || u.client?.companyName || "-" },
          { header: "Ultimo acesso", accessor: (u) => formatDateTime(u.lastLoginAt) },
          {
            header: "Ativo",
            accessor: (u) => (
              <button onClick={(e) => { e.stopPropagation(); handleToggleActive(u.id, u.active); }}>
                <StatusBadge status={u.active ? "ACTIVE" : "INACTIVE"} />
              </button>
            ),
          },
          {
            header: "",
            accessor: (u) => (
              <button
                onClick={(e) => { e.stopPropagation(); handleResetPassword(u.id); }}
                className="text-graphite-400 hover:text-navy-700"
                aria-label="Redefinir senha"
              >
                <KeyRound className="h-4 w-4" />
              </button>
            ),
          },
        ]}
      />

      <UserFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => {
          setCreateOpen(false);
          queryClient.invalidateQueries({ queryKey: ["users"] });
        }}
      />
      <UserFormModal
        open={!!editingUser}
        user={editingUser}
        onClose={() => setEditingUser(undefined)}
        onSaved={() => {
          setEditingUser(undefined);
          queryClient.invalidateQueries({ queryKey: ["users"] });
        }}
      />
      <RolesInfoModal open={rolesOpen} onClose={() => setRolesOpen(false)} />

      <Modal open={!!tempPassword} onClose={() => setTempPassword(null)} title="Senha temporaria gerada" size="sm">
        <p className="text-sm text-graphite-600">
          Compartilhe esta senha com o usuario por um canal seguro (ela nao sera exibida novamente):
        </p>
        <p className="mt-3 rounded-md bg-navy-50 px-3 py-2 text-center font-mono text-lg font-bold text-navy-900">{tempPassword}</p>
      </Modal>
    </div>
  );
}
