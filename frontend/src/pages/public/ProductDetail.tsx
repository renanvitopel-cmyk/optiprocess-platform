import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Star, ShoppingCart, FileText, Check } from "lucide-react";
import { getProduct } from "../../api/products";
import { formatCurrency } from "../../lib/format";
import { FullPageSpinner } from "../../components/Spinner";
import { useCart } from "../../cart/CartContext";
import NotFound from "../NotFound";

export default function ProductDetail() {
  const { idOrSlug = "" } = useParams<{ idOrSlug: string }>();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ["public-product", idOrSlug],
    queryFn: () => getProduct(idOrSlug),
  });

  if (isLoading) return <FullPageSpinner />;
  if (isError || !product) return <NotFound />;

  const available = product.status === "ACTIVE";

  return (
    <div className="section-y">
      <div className="container-page grid gap-10 lg:grid-cols-2">
        <div className="flex h-80 items-center justify-center rounded-xl bg-navy-50 text-navy-300">
          <Star className="h-16 w-16" />
        </div>

        <div>
          <p className="text-sm text-navy-600">
            <Link to="/produtos" className="hover:underline">
              Produtos
            </Link>{" "}
            / {product.category?.name}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-navy-900 sm:text-3xl">{product.name}</h1>
          {product.brand && <p className="mt-1 text-graphite-500">Marca: {product.brand}</p>}

          <p className="mt-4 text-3xl font-bold text-navy-800">
            {product.priceOnRequest ? "Sob consulta" : formatCurrency(product.price)}
          </p>
          {!product.priceOnRequest && product.promoPrice && (
            <p className="text-sm text-graphite-400 line-through">{formatCurrency(product.price)}</p>
          )}

          {product.description && <p className="mt-4 text-graphite-600">{product.description}</p>}

          {product.technicalSheetUrl && (
            <a
              href={product.technicalSheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-navy-700 hover:underline"
            >
              <FileText className="h-4 w-4" /> Ficha tecnica
            </a>
          )}

          {available ? (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="input w-24"
              />
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  addItem({ productId: product.id, name: product.name, sku: product.sku }, quantity);
                  setAdded(true);
                  setTimeout(() => setAdded(false), 2000);
                }}
              >
                {added ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
                {added ? "Adicionado" : "Adicionar ao carrinho"}
              </button>
            </div>
          ) : (
            <p className="mt-6 font-medium text-safety-red">Produto indisponivel no momento. Fale com nosso comercial.</p>
          )}
        </div>
      </div>
    </div>
  );
}
