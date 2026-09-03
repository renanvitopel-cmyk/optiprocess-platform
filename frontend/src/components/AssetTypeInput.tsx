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
   * desativado, digitado antes desta lista existir...), entra como opcao extra pra nao
   * trocar o tipo do ativo silenciosamente so por abrir o formulario de edicao. */
  currentValue?: string | null;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void;
}

/** Lista fechada do catalogo "Tipo de ativo" (Planta/Maquina/Subconjunto/Parte...) - so
 * escolhe entre o que ja esta cadastrado. Cadastrar um tipo novo agora e' deliberado, na
 * tela "Tipos de ativo" (onde da pra escolher o nivel certo), nao mais digitando aqui -
 * evita que qualquer coisa (ex.: um cargo de mao de obra) vire "tipo de ativo" por engano. */
export const AssetTypeInput = forwardRef<HTMLSelectElement, Props>(function AssetTypeInput(
  { label = "Tipo de ativo", currentValue, ...rest },
  ref,
) {
  const { data: types } = useQuery({
    queryKey: ["asset-types-picker"],
    queryFn: () => listAssetTypes({ active: true }),
    staleTime: 60_000,
  });

  const options = (types ?? []).map((t) => ({ value: t.name, label: t.name }));
  if (currentValue && !options.some((o) => o.value.toLowerCase() === currentValue.toLowerCase())) {
    options.unshift({ value: currentValue, label: `${currentValue} (fora do catalogo)` });
  }

  return (
    <SelectInput
      ref={ref}
      label={label}
      placeholder="Selecione..."
      hint="Cadastre um tipo novo em Ativos > Tipos de ativo."
      options={options}
      {...rest}
    />
  );
});
