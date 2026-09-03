import { forwardRef, useId, type FocusEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TextInput } from "./form/Field";

interface CatalogEntry {
  id: string;
  name: string;
}

interface Props {
  label: string;
  hint?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  name: string;
  queryKey: string;
  list: () => Promise<CatalogEntry[]>;
  create: (name: string) => Promise<unknown>;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
}

/** Texto com sugestoes de um catalogo pre-cadastrado via datalist nativo - digita livre,
 * mas o que sair da lista se incorpora ao catalogo sozinho (silencioso, so pra proxima
 * vez aparecer sugerido). Base comum de AssetTypeInput e LaborTypeInput. */
export const CatalogInput = forwardRef<HTMLInputElement, Props>(function CatalogInput(
  { label, hint, placeholder, error, required, queryKey, list, create, onBlur, ...rest },
  ref,
) {
  const listId = useId();
  const queryClient = useQueryClient();
  const { data: entries } = useQuery({ queryKey: [queryKey], queryFn: list, staleTime: 60_000 });

  async function handleBlur(e: FocusEvent<HTMLInputElement>) {
    onBlur?.(e);
    const value = e.target.value.trim();
    const known = (entries ?? []).some((t) => t.name.toLowerCase() === value.toLowerCase());
    if (value && !known) {
      try {
        await create(value);
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      } catch {
        // Cadastro do registro principal nao depende disso - so deixa de crescer o
        // catalogo desta vez (ex.: nome colidiu com outro em maiusculas diferentes).
      }
    }
  }

  return (
    <>
      <TextInput
        ref={ref}
        label={label}
        required={required}
        error={error}
        list={listId}
        placeholder={placeholder}
        hint={hint}
        onBlur={handleBlur}
        {...rest}
      />
      <datalist id={listId}>
        {(entries ?? []).map((t) => (
          <option key={t.id} value={t.name} />
        ))}
      </datalist>
    </>
  );
});
