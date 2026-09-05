import { forwardRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { listAssetTypes } from "../api/assetTypes";
import { SelectInput } from "./form/Field";
import { ASSET_LEVEL_LABELS } from "../lib/assetHierarchy";
import type { AssetHierarchyLevel } from "../api/types";

/** O que cada nivel exige - dito no proprio seletor, na hora da escolha. */
const DICA_DO_NIVEL: Record<AssetHierarchyLevel, string> = {
  PLANT: " - fica na raiz, sem ativo pai",
  AREA: " - exige ativo pai",
  MACHINE: " - exige ativo pai, fabricante, modelo e numero de serie",
  SUBASSEMBLY: " - exige ativo pai",
  PART: " - exige ativo pai",
};

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

  // Agrupado por NIVEL, porque e' o nivel que decide as regras do cadastro: so Planta fica
  // na raiz, e Maquina exige fabricante/modelo/numero de serie. Numa lista corrida de
  // "Bomba, Motor, Planta, Valvula" nao havia como perceber isso antes de escolher.
  const ordem: (AssetHierarchyLevel | "SEM_NIVEL")[] = ["PLANT", "AREA", "MACHINE", "SUBASSEMBLY", "PART", "SEM_NIVEL"];
  const porNivel = new Map<string, { value: string; label: string }[]>();
  for (const t of types ?? []) {
    const chave = t.level ?? "SEM_NIVEL";
    const lista = porNivel.get(chave) ?? [];
    lista.push({ value: t.name, label: t.name });
    porNivel.set(chave, lista);
  }

  const grupos = ordem
    .filter((nivel) => (porNivel.get(nivel)?.length ?? 0) > 0)
    .map((nivel) => ({
      titulo:
        nivel === "SEM_NIVEL"
          ? "Sem nivel definido - nenhuma regra e' aplicada"
          : `${ASSET_LEVEL_LABELS[nivel as AssetHierarchyLevel]}${DICA_DO_NIVEL[nivel as AssetHierarchyLevel]}`,
      options: (porNivel.get(nivel) ?? []).sort((a, b) => a.label.localeCompare(b.label)),
    }));

  const options = grupos.flatMap((g) => g.options);
  if (currentValue && !options.some((o) => o.value.toLowerCase() === currentValue.toLowerCase())) {
    grupos.unshift({ titulo: "Fora do catalogo", options: [{ value: currentValue, label: currentValue }] });
  }

  return (
    <SelectInput
      ref={ref}
      label={label}
      placeholder="Selecione..."
      hint="O nivel do tipo define as regras do cadastro. Cadastre tipos novos em Ativos > Tipos de ativo."
      options={options}
      grupos={grupos}
      {...rest}
    />
  );
});
