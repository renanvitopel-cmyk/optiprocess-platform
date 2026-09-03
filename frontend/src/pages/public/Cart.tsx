import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Trash2, ShoppingCart } from "lucide-react";
import { useCart } from "../../cart/CartContext";
import { useAuth } from "../../auth/AuthContext";
import { TextInput, TextareaInput } from "../../components/form/Field";
import { submitPublicQuote } from "../../api/publicApi";
import { getApiErrorMessage } from "../../api/client";
import { useToast } from "../../components/Toast";
import { EmptyState } from "../../components/EmptyState";

const schema = z.object({
  contactName: z.string().min(2, "Informe seu nome."),
  contactEmail: z.string().email("Informe um e-mail válido."),
  contactPhone: z.string().optional(),
  message: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function Cart() {
  const { items, updateQuantity, removeItem, clear } = useCart();
  const { user } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { contactName: user?.name ?? "", contactEmail: user?.email ?? "" },
  });

  async function onSubmit(values: FormValues) {
    try {
      const result = await submitPublicQuote({
        source: "PRODUCT_CART",
        contactName: values.contactName,
        contactEmail: values.contactEmail,
        contactPhone: values.contactPhone,
        message: values.message,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });
      setSubmitted(result.number);
      clear();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  if (submitted) {
    return (
      <div className="container-page section-y max-w-lg text-center">
        <ShoppingCart className="mx-auto h-12 w-12 text-safety-green" />
        <h1 className="mt-4 text-2xl font-bold text-navy-900">Pedido de cotação enviado!</h1>
        <p className="mt-2 text-graphite-500">
          Número da solicitação: <strong>{submitted}</strong>. Nossa equipe comercial vai analisar e retornar em
          breve com valores e prazos.
        </p>
        <button className="btn-primary mt-6" onClick={() => navigate("/produtos")}>
          Continuar navegando
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container-page section-y">
        <EmptyState
          icon={ShoppingCart}
          title="Seu carrinho está vazio"
          description="Adicione produtos do catálogo para solicitar uma cotação."
          action={
            <Link to="/produtos" className="btn-primary">
              Ver produtos
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-page section-y">
      <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">Seu carrinho</h1>
      <p className="mt-2 text-graphite-500">Revise os itens e envie como pedido de cotação para nossa equipe comercial.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="table-shell lg:col-span-2">
          <table className="table-base">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Quantidade</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.productId}>
                  <td>
                    <p className="font-medium text-navy-900">{item.name}</p>
                    <p className="text-xs text-graphite-400">SKU: {item.sku}</p>
                  </td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      className="input w-20"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.productId, Number(e.target.value))}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="text-graphite-400 hover:text-safety-red"
                      onClick={() => removeItem(item.productId)}
                      aria-label="Remover item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card h-fit space-y-4 p-5" noValidate>
          <h2 className="font-semibold text-navy-900">Seus dados</h2>
          <TextInput label="Nome" required error={errors.contactName?.message} {...register("contactName")} />
          <TextInput label="E-mail" type="email" required error={errors.contactEmail?.message} {...register("contactEmail")} />
          <TextInput label="Telefone / WhatsApp" error={errors.contactPhone?.message} {...register("contactPhone")} />
          <TextareaInput label="Observações" rows={3} {...register("message")} />
          <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting ? "Enviando..." : "Enviar pedido de cotação"}
          </button>
        </form>
      </div>
    </div>
  );
}
