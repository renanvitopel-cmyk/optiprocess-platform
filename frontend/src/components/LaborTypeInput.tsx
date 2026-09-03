import { forwardRef } from "react";
import { listLaborTypes, createLaborType } from "../api/laborTypes";
import { CatalogInput } from "./CatalogInput";

interface Props {
  label?: string;
  error?: string;
  required?: boolean;
  name: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

export const LaborTypeInput = forwardRef<HTMLInputElement, Props>(function LaborTypeInput(
  { label = "Tipo de mao de obra", ...rest },
  ref,
) {
  return (
    <CatalogInput
      ref={ref}
      label={label}
      placeholder="Ex.: Tecnico mecanico, Tecnico eletrico, Engenheiro..."
      hint="Comece a digitar para ver sugestoes do catalogo, ou digite um tipo novo."
      queryKey="labor-types-picker"
      list={() => listLaborTypes({ active: true })}
      create={(name) => createLaborType({ name })}
      {...rest}
    />
  );
});
