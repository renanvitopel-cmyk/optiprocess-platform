import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Star } from "lucide-react";
import { listProducts, listProductCategories } from "../../api/products";
import { formatCurrency } from "../../lib/format";
import { InlineSpinner } from "../../components/Spinner";
import { EmptyState } from "../../components/EmptyState";

export default function Products() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [page, setPage] = useState(1);

  const { data: categories } = useQuery({ queryKey: ["public-categories"], queryFn: listProductCategories });
  const { data, isLoading } = useQuery({
    queryKey: ["public-products", search, categoryId, page],
    queryFn: () => listProducts({ search: search || undefined, categoryId: categoryId || undefined, page, pageSize: 12 }),
  });

  return (
    <div>
      <section className="bg-navy-950 py-14 text-white">
        <div className="container-page">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">Produtos</h1>
          <p className="mt-3 max-w-2xl text-navy-200">
            Materiais eletricos, automacao Gefran, inversores e carregadores veiculares WEG WEMOB.
          </p>
        </div>
      </section>

      <section className="section-y bg-white">
        <div className="container-page">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
              <input
                className="input pl-9"
                placeholder="Buscar por nome, SKU ou marca..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <select
              className="input sm:w-64"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas as categorias</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {isLoading && <InlineSpinner label="Carregando produtos..." />}

          {!isLoading && data?.items.length === 0 && (
            <EmptyState title="Nenhum produto encontrado" description="Ajuste os filtros ou tente outra busca." />
          )}

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data?.items.map((product) => (
              <Link key={product.id} to={`/produtos/${product.slug}`} className="card overflow-hidden transition-shadow hover:shadow-md">
                <div className="flex h-32 items-center justify-center bg-navy-50 text-navy-300">
                  <Star className="h-8 w-8" />
                </div>
                <div className="p-4">
                  <p className="text-xs uppercase tracking-wide text-graphite-400">{product.category?.name}</p>
                  <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-navy-900">{product.name}</h3>
                  <p className="mt-2 font-bold text-navy-800">
                    {product.priceOnRequest ? "Sob consulta" : formatCurrency(product.price)}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {data && data.totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              <button className="btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </button>
              <span className="flex items-center px-2 text-sm text-graphite-500">
                Pagina {data.page} de {data.totalPages}
              </span>
              <button className="btn-outline btn-sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                Proxima
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
