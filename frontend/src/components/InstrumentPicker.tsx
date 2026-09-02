import { forwardRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { listInstruments } from "../api/instruments";
import { SelectInput } from "./form/Field";

interface InstrumentPickerProps {
  label?: string;
  error?: string;
  required?: boolean;
  clientId?: string;
  /** Exclui este ativo das opcoes - usado no seletor de "Ativo pai" para nao deixar
   * um ativo apontar para si mesmo. */
  excludeId?: string;
  name: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void;
}

export const InstrumentPicker = forwardRef<HTMLSelectElement, InstrumentPickerProps>(function InstrumentPicker(
  { label = "Ativo", error, required, clientId, excludeId, ...rest },
  ref,
) {
  const { data } = useQuery({
    queryKey: ["instruments-picker", clientId],
    queryFn: () => listInstruments({ clientId, pageSize: 200 }),
    enabled: !!clientId,
  });

  return (
    <SelectInput
      ref={ref}
      label={label}
      required={required}
      error={error}
      placeholder={clientId ? "Selecione o ativo" : "Selecione o cliente primeiro"}
      disabled={!clientId}
      options={(data?.items ?? [])
        .filter((i) => i.id !== excludeId)
        .map((i) => ({ value: i.id, label: `${i.tag ?? i.type} - ${i.model} (${i.serialNumber})` }))}
      {...rest}
    />
  );
});
