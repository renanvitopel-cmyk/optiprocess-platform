import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { listReferenceStandards } from "../../../api/referenceStandards";
import { PageHeader } from "../../../components/PageHeader";
import { DataTable } from "../../../components/DataTable";
import { StatusBadge } from "../../../components/StatusBadge";
import { ReferenceStandardFormModal } from "./ReferenceStandardFormModal";

/** Padroes de referencia sao o equipamento comparativo proprio da OptiProcess (nao do
 * cliente) - por isso essa tela vive fora de Ativos/Instrumentos, e nunca aparece pro
 * portal do cliente (a rota e' STAFF_ROLES so no backend). */
export default function ReferenceStandardsList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["reference-standards", search],
    queryFn: () => listReferenceStandards({ active: true, search: search || undefined }),
  });

  return (
    <div>
      <PageHeader
        title="Padroes de referencia"
        description="Equipamentos proprios usados como comparativo nas calibracoes"
        actions={
          <button className="btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Novo padrao
          </button>
        }
      />

      <div className="mb-4 relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
        <input
          className="input pl-9 sm:max-w-sm"
          placeholder="Buscar por descricao, fabricante, numero de serie..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <DataTable
        loading={isLoading}
        rows={data ?? []}
        keyField={(s) => s.id}
        onRowClick={(s) => navigate(`/gestao/padroes-referencia/${s.id}`)}
        emptyTitle="Nenhum padrao cadastrado"
        emptyDescription="Cadastre os equipamentos que a OptiProcess usa como referencia nas calibracoes."
        columns={[
          {
            header: "Padrao",
            accessor: (s) => (
              <div className="flex items-center gap-2.5">
                {s.photoUrl && <img src={s.photoUrl} alt="" className="h-9 w-9 shrink-0 rounded-md border border-gray-200 object-cover" />}
                <div className="min-w-0">
                  <p className="font-medium text-navy-900">{s.description}</p>
                  <p className="text-xs text-graphite-400">{s.type ?? "-"}{s.model ? ` - ${s.model}` : ""}</p>
                </div>
              </div>
            ),
          },
          { header: "Fabricante", accessor: (s) => s.manufacturer ?? "-" },
          { header: "Numero de serie", accessor: (s) => s.serialNumber ?? "-" },
          { header: "Certificado", accessor: (s) => <StatusBadge status={s.certificationStatus} /> },
        ]}
      />

      <ReferenceStandardFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={(item) => {
          setCreateOpen(false);
          queryClient.invalidateQueries({ queryKey: ["reference-standards"] });
          navigate(`/gestao/padroes-referencia/${item.id}`);
        }}
      />
    </div>
  );
}
