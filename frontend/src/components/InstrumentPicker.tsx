import { forwardRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { listInstruments } from "../api/instruments";
import { SelectInput } from "./form/Field";
import { useCmms } from "../lib/cmms";

interface InstrumentPickerProps {
  label?: string;
  hint?: string;
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
  { label = "Ativo", hint, error, required, clientId, excludeId, ...rest },
  ref,
) {
  // No portal o backend ja restringe a lista a empresa do usuario, entao nao ha
  // (nem faz sentido pedir) um clientId para liberar o seletor.
  const { isClient } = useCmms();
  const ready = isClient || !!clientId;
  const { data } = useQuery({
    queryKey: ["instruments-picker", clientId ?? "own"],
    queryFn: () => listInstruments({ clientId, pageSize: 200 }),
    enabled: ready,
  });

  return (
    <SelectInput
      ref={ref}
      label={label}
      hint={hint}
      required={required}
      error={error}
      placeholder={ready ? "Selecione o ativo" : "Selecione o cliente primeiro"}
      disabled={!ready}
      options={(data?.items ?? [])
        .filter((i) => i.id !== excludeId)
        .map((i) => ({ value: i.id, label: [i.tag ?? i.type, i.description || i.model].filter(Boolean).join(" - ") }))}
      {...rest}
    />
  );
});
