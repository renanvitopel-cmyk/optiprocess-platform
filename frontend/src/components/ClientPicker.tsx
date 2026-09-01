import { forwardRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { listClients } from "../api/clients";
import { SelectInput } from "./form/Field";

interface ClientPickerProps {
  label?: string;
  error?: string;
  required?: boolean;
  name: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void;
}

export const ClientPicker = forwardRef<HTMLSelectElement, ClientPickerProps>(function ClientPicker(
  { label = "Cliente", error, required, ...rest },
  ref,
) {
  const { data } = useQuery({
    queryKey: ["clients-picker"],
    queryFn: () => listClients({ pageSize: 100 }),
    staleTime: 60_000,
  });

  return (
    <SelectInput
      ref={ref}
      label={label}
      required={required}
      error={error}
      placeholder="Selecione o cliente"
      options={(data?.items ?? []).map((c) => ({ value: c.id, label: c.tradeName || c.companyName }))}
      {...rest}
    />
  );
});
