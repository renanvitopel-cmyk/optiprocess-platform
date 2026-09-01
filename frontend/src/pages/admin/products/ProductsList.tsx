import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Tags } from "lucide-react";
import { listProducts, listProductCategories } from "../../../api/products";
import type { ProductStatus } from "../../../api/types";
import { PageHeader } from "../../../components/PageHeader";
import { DataTable } from "../../../components/DataTable";
import { StatusBadge } from "../../../components/StatusBadge";
import { formatCurrency } from "../../../lib/format";
import { ProductFormModal } from "./ProductFormModal";
import { CategoriesModal } from "./CategoriesModal";

export default function ProductsList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<ProductStatus | "">("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const { data: categories } = useQuery({ queryKey: ["product-categories"], queryFn: listProductCategories });
  const { data, isLoading } = useQuery({
    queryKey: ["admin-products", search, categoryId, status, page],
    queryFn: () => listProducts({ search: search || undefined, categoryId: categoryId || undefined, status: status || undefined, page, pageSize: 15 }),
  });

  return (
    <div>
      <PageHeader
        title="Produtos e estoque"
        description="Catalogo de materiais eletricos, automacao e carregadores"
        actions={
          <>
            <button className="btn-outline" onClick={() => setCategoriesOpen(true)}>
              <Tags className="h-4 w-4" /> Categorias
            </button>
            <button className="btn-primary" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Novo produto
            </button>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
          <input className="input pl-9" placeholder="Buscar por nome, SKU ou marca..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input sm:w-56" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}>
          <option value="">Todas as categorias</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select className="input sm:w-44" value={status} onChange={(e) => { setStatus(e.target.value as ProductStatus | ""); setPage(1); }}>
          <option value="">Todos os status</option>
          <option value="ACTIVE">Ativo</option>
          <option value="INACTIVE">Inativo</option>
          <option value="UNAVAILABLE">Indisponivel</option>
        </select>
      </div>

      <DataTable
        loading={isLoading}
        rows={data?.items ?? []}
        keyField={(p) => p.id}
        onRowClick={(p) => navigate(`/gestao/produtos/${p.id}`)}
        pagination={data}
        onPageChange={setPage}
        emptyTitle="Nenhum produto cadastrado"
        columns={[
          { header: "Produto", accessor: (p) => <span className="font-medium text-navy-900">{p.name}</span> },
          { header: "SKU", accessor: (p) => p.sku },
          { header: "Categoria", accessor: (p) => p.category?.name ?? "-" },
          { header: "Preco", accessor: (p) => (p.priceOnRequest ? "Sob consulta" : formatCurrency(p.price)) },
          {
            header: "Estoque",
            accessor: (p) => (
              <span className={p.stockQty <= p.minStock ? "font-semibold text-safety-red" : ""}>{p.stockQty}</span>
            ),
          },
          { header: "Status", accessor: (p) => <StatusBadge status={p.status} /> },
        ]}
      />

      <ProductFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={(product) => {
          setCreateOpen(false);
          queryClient.invalidateQueries({ queryKey: ["admin-products"] });
          navigate(`/gestao/produtos/${product.id}`);
        }}
      />
      <CategoriesModal open={categoriesOpen} onClose={() => setCategoriesOpen(false)} />
    </div>
  );
}
