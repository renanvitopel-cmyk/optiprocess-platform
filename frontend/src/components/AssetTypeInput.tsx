import { forwardRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { listAssetTypes } from "../api/assetTypes";
import { SelectInput } from "./form/Field";

interface Props {
  label?: string;
  error?: string;
  required?: boolean;
  name: string;
  /** Valor atual do ativo sendo editado - se nao estiver mais no catalogo ativo (tipo
   * desativado, ou cadastrado antes desta lista existir), entra como opcao extra pra nao
   * trocar o tipo do ativo silenciosamente so por abrir o formulario de edicao. */
  currentValue?: string | null;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void;
}

/**
 * Que equipamento e' este ("Multimetro", "Manometro", "Termometro"...) - catalogo
 * pre-cadastrado em Cadastros tecnicos > Tipos de ativo.
 */
export const AssetTypeInput = forwardRef<HTMLSelectElement, Props>(function AssetTypeInput(
  { label, currentValue, ...rest },
  ref,
) {
  const { data: types } = useQuery({
    queryKey: ["asset-types-picker"],
    queryFn: () => listAssetTypes({ active: true }),
    staleTime: 60_000,
  });

  const options = (types ?? []).map((t) => ({ value: t.name, label: t.name }));

  if (currentValue && !options.some((o) => o.value === currentValue)) {
    options.unshift({ value: currentValue, label: `${currentValue} (fora da lista)` });
  }

  return (
    <SelectInput
      ref={ref}
      label={label ?? "Tipo de ativo"}
      placeholder="Nao especificar"
      hint="Opcional. Novos tipos em Cadastros > Tipos de ativo."
      options={options}
      {...rest}
    />
  );
});
