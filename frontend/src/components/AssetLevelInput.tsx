import { forwardRef } from "react";
import { SelectInput } from "./form/Field";
import { ASSET_LEVEL_LABELS } from "../lib/assetHierarchy";
import type { AssetHierarchyLevel } from "../api/types";

/** O que cada nivel significa, dito na propria lista. */
const DESCRICAO_DO_NIVEL: Record<AssetHierarchyLevel, string> = {
  PLANT: "Planta - a unidade inteira, fica na raiz",
  AREA: "Area / Linha - um trecho da planta",
  MACHINE: "Maquina - o equipamento em si",
  SUBASSEMBLY: "Subconjunto - um conjunto dentro da maquina",
  PART: "Parte - uma peca isolada",
};

interface Props {
  label?: string;
  error?: string;
  required?: boolean;
  name: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void;
}

/**
 * Onde o ativo fica na arvore. Substitui o antigo "Tipo de ativo": eram dois campos
 * dizendo a mesma coisa - escolher "Bomba" ou "Planta" numa lista de dezenas de tipos era
 * o que, sem avisar, definia o nivel e as regras do cadastro. Agora o nivel e' escolhido
 * direto, em cinco opcoes, e "que equipamento e' esse" fica na descricao, onde a pessoa
 * escreve o que quiser.
 */
export const AssetLevelInput = forwardRef<HTMLSelectElement, Props>(function AssetLevelInput(
  { label = "Nivel na arvore", ...rest },
  ref,
) {
  return (
    <SelectInput
      ref={ref}
      label={label}
      placeholder="Nao classificado"
      hint="Decide o icone na arvore e quem pode ficar na raiz."
      options={(Object.keys(ASSET_LEVEL_LABELS) as AssetHierarchyLevel[]).map((value) => ({
        value,
        label: DESCRICAO_DO_NIVEL[value],
      }))}
      {...rest}
    />
  );
});
