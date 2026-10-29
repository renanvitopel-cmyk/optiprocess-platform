import type { UseFormRegisterReturn } from "react-hook-form";
import { SelectInput, TextInput } from "./Field";

interface Props {
  expanded: UseFormRegisterReturn;
  mode: UseFormRegisterReturn;
  k: UseFormRegisterReturn;
  className?: string;
}

/**
 * Incerteza expandida declarada no certificado de um padrao: o valor (U), como o
 * laboratorio a expressou e o fator k. E' a parcela principal da incerteza que o sistema
 * calcula em cada ponto das calibracoes feitas com esse padrao.
 */
export function UncertaintyFields({ expanded, mode, k, className = "" }: Props) {
  return (
    <div className={`grid gap-4 sm:grid-cols-3 ${className}`}>
      <TextInput
        label="Incerteza expandida (U)"
        inputMode="decimal"
        placeholder="Ex.: 0,02"
        hint="Como consta no certificado do laboratório."
        {...expanded}
      />
      <SelectInput
        label="Expressa em"
        options={[
          { value: "ABSOLUTE", label: "Unidade do padrão" },
          { value: "PERCENT_READING", label: "% da leitura" },
        ]}
        {...mode}
      />
      <TextInput label="Fator k" inputMode="decimal" placeholder="2" hint="Normalmente k = 2 (≈95%)." {...k} />
    </div>
  );
}

/** Converte o texto digitado ("0,02", "") no numero que vai para a API. */
export function parseDecimal(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
