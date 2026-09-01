import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "../../../components/Modal";
import { TextInput, TextareaInput, SelectInput, CheckboxInput } from "../../../components/form/Field";
import { createProduct, listProductCategories, updateProduct } from "../../../api/products";
import type { Product } from "../../../api/types";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";

const schema = z.object({
  name: z.string().min(2, "Informe o nome do produto."),
  sku: z.string().min(1, "Informe o SKU."),
  categoryId: z.string().uuid("Selecione a categoria."),
  brand: z.string().optional(),
  description: z.string().optional(),
  technicalSheetUrl: z.string().url("URL invalida.").optional().or(z.literal("")),
  price: z.coerce.number().optional(),
  promoPrice: z.coerce.number().optional(),
  priceOnRequest: z.boolean().optional(),
  minStock: z.coerce.number().int().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "UNAVAILABLE"]).optional(),
  featured: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

export function ProductFormModal({
  open,
  onClose,
  onSaved,
  product,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (product: Product) => void;
  product?: Product;
}) {
  const { notify } = useToast();
  const { data: categories } = useQuery({ queryKey: ["product-categories"], queryFn: listProductCategories, enabled: open });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: "ACTIVE" },
  });

  useEffect(() => {
    if (open) {
      reset(
        product
          ? {
              name: product.name,
              sku: product.sku,
              categoryId: product.categoryId,
              brand: product.brand ?? "",
              description: product.description ?? "",
              technicalSheetUrl: product.technicalSheetUrl ?? "",
              price: product.price ?? undefined,
              promoPrice: product.promoPrice ?? undefined,
              priceOnRequest: product.priceOnRequest,
              minStock: product.minStock,
              status: product.status,
              featured: product.featured,
            }
          : { status: "ACTIVE" },
      );
    }
  }, [open, product, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const saved = product ? await updateProduct(product.id, values) : await createProduct(values);
      notify("success", product ? "Produto atualizado." : "Produto cadastrado.");
      onSaved(saved);
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={product ? "Editar produto" : "Novo produto"} size="lg" footer={
      <>
        <button type="button" className="btn-outline" onClick={onClose}>Cancelar</button>
        <button type="submit" form="product-form" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar"}
        </button>
      </>
    }>
      <form id="product-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Nome" required error={errors.name?.message} {...register("name")} />
          <TextInput label="SKU" required error={errors.sku?.message} {...register("sku")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectInput
            label="Categoria"
            required
            placeholder="Selecione"
            options={(categories ?? []).map((c) => ({ value: c.id, label: c.name }))}
            error={errors.categoryId?.message}
            {...register("categoryId")}
          />
          <TextInput label="Marca" {...register("brand")} />
        </div>
        <TextareaInput label="Descricao" rows={3} {...register("description")} />
        <TextInput label="Link da ficha tecnica (opcional)" error={errors.technicalSheetUrl?.message} {...register("technicalSheetUrl")} />
        <div className="grid gap-4 sm:grid-cols-3">
          <TextInput label="Preco" type="number" step="0.01" {...register("price")} />
          <TextInput label="Preco promocional" type="number" step="0.01" {...register("promoPrice")} />
          <TextInput label="Estoque minimo" type="number" {...register("minStock")} />
        </div>
        <div className="flex gap-6">
          <CheckboxInput label="Preco sob consulta" {...register("priceOnRequest")} />
          <CheckboxInput label="Destaque no site" {...register("featured")} />
        </div>
        {product && (
          <SelectInput
            label="Status"
            options={[
              { value: "ACTIVE", label: "Ativo" },
              { value: "INACTIVE", label: "Inativo" },
              { value: "UNAVAILABLE", label: "Indisponivel" },
            ]}
            {...register("status")}
          />
        )}
      </form>
    </Modal>
  );
}
