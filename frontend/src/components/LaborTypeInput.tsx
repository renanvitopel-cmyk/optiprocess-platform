import { forwardRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { listLaborTypes } from "../api/laborTypes";
import { SelectInput } from "./form/Field";

interface Props {
  label?: string;
  error?: string;
  required?: boolean;
  name: string;
  /** Tipo atual do recurso sendo editado - se ele nao estiver mais no catalogo ativo
   * (cadastrado antes desta lista existir, ou desativado depois), entra como opcao extra
   * pra abrir o formulario de edicao nao trocar a funcao da pessoa em silencio. */
  currentValue?: string | null;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void;
}

/**
 * Lista fechada do catalogo "Tipos de mao de obra". Era texto livre com sugestoes, e o
 * mesmo cargo acabava cadastrado como "Tecnico mecanico", "Tec. mecanico" e "mecanico" -
 * na hora de somar HH e custo por especialidade viravam tres funcoes distintas. Tipo novo
 * agora e' cadastrado de proposito em Cadastros > Tipos de mao de obra.
 */
export const LaborTypeInput = forwardRef<HTMLSelectElement, Props>(function LaborTypeInput(
  { label = "Tipo de mao de obra", currentValue, ...rest },
  ref,
) {
  const { data: types } = useQuery({
    queryKey: ["labor-types-picker"],
    queryFn: () => listLaborTypes({ active: true }),
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
      placeholder="Selecione o tipo"
      hint="Para incluir uma funcao nova, use Cadastros > Tipos de mao de obra."
      options={options}
      {...rest}
    />
  );
});
