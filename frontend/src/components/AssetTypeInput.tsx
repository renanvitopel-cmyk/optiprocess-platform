import { forwardRef, useId, type FocusEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listAssetTypes, createAssetType } from "../api/assetTypes";
import { TextInput } from "./form/Field";

interface Props {
  label?: string;
  error?: string;
  required?: boolean;
  name: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
}

/** Campo de texto com sugestoes de um catalogo pre-cadastrado (motor, compressor,
 * extrusora...) via datalist nativo - digita livre, mas o que sair da lista some
 * incorporado ao catalogo sozinho (silencioso, so pra proxima vez aparecer sugerido). */
export const AssetTypeInput = forwardRef<HTMLInputElement, Props>(function AssetTypeInput(
  { label = "Tipo de ativo", error, required, onBlur, ...rest },
  ref,
) {
  const listId = useId();
  const queryClient = useQueryClient();
  const { data: types } = useQuery({ queryKey: ["asset-types-picker"], queryFn: () => listAssetTypes({ active: true }), staleTime: 60_000 });

  async function handleBlur(e: FocusEvent<HTMLInputElement>) {
    onBlur?.(e);
    const value = e.target.value.trim();
    const known = (types ?? []).some((t) => t.name.toLowerCase() === value.toLowerCase());
    if (value && !known) {
      try {
        await createAssetType({ name: value });
        queryClient.invalidateQueries({ queryKey: ["asset-types-picker"] });
      } catch {
        // Cadastro do ativo em si nao depende disso - so deixa de crescer o catalogo
        // desta vez (ex.: nome colidiu com outro em maiusculas diferentes).
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
        placeholder="Ex.: Motor, Compressor, Extrusora..."
        hint="Comece a digitar para ver sugestoes do catalogo, ou digite um tipo novo."
        onBlur={handleBlur}
        {...rest}
      />
      <datalist id={listId}>
        {(types ?? []).map((t) => (
          <option key={t.id} value={t.name} />
        ))}
      </datalist>
    </>
  );
});
