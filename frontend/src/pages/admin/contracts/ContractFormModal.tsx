import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "../../../components/Modal";
import { TextInput, TextareaInput, SelectInput } from "../../../components/form/Field";
import { ClientPicker } from "../../../components/ClientPicker";
import { UserPicker } from "../../../components/UserPicker";
import { createContract, updateContract } from "../../../api/contracts";
import type { ServiceContract } from "../../../api/types";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";

const schema = z.object({
  clientId: z.string().uuid("Selecione o cliente."),
  serviceName: z.string().min(2, "Informe o servico contratado."),
  startDate: z.string().min(1, "Informe a vigencia inicial."),
  endDate: z.string().optional(),
  value: z.coerce.number().optional(),
  periodicity: z.enum(["MONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL", "ONE_TIME", "OTHER"]),
  responsibleId: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "EXPIRING_SOON", "EXPIRED", "CANCELED"]).optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function ContractFormModal({
  open,
  onClose,
  onSaved,
  contract,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  contract?: ServiceContract;
}) {
  const { notify } = useToast();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { periodicity: "MONTHLY" },
  });

  useEffect(() => {
    if (open) {
      reset(
        contract
          ? {
              clientId: contract.clientId,
              serviceName: contract.serviceName,
              startDate: contract.startDate.slice(0, 10),
              endDate: contract.endDate?.slice(0, 10) ?? "",
              value: contract.value ?? undefined,
              periodicity: contract.periodicity,
              responsibleId: contract.responsibleId ?? "",
              status: contract.status,
              notes: contract.notes ?? "",
            }
          : { periodicity: "MONTHLY" },
      );
    }
  }, [open, contract, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const payload = { ...values, responsibleId: values.responsibleId || null };
      if (contract) await updateContract(contract.id, payload);
      else await createContract(payload);
      notify("success", contract ? "Contrato atualizado." : "Contrato cadastrado.");
      onSaved();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={contract ? "Editar contrato" : "Novo contrato"} footer={
      <>
        <button type="button" className="btn-outline" onClick={onClose}>Cancelar</button>
        <button type="submit" form="contract-form" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar"}
        </button>
      </>
    }>
      <form id="contract-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <ClientPicker required error={errors.clientId?.message} {...register("clientId")} />
        <TextInput label="Servico contratado" required error={errors.serviceName?.message} {...register("serviceName")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Vigencia inicial" type="date" required error={errors.startDate?.message} {...register("startDate")} />
          <TextInput label="Vigencia final" type="date" {...register("endDate")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Valor (opcional)" type="number" step="0.01" {...register("value")} />
          <SelectInput
            label="Periodicidade"
            options={[
              { value: "MONTHLY", label: "Mensal" },
              { value: "QUARTERLY", label: "Trimestral" },
              { value: "SEMIANNUAL", label: "Semestral" },
              { value: "ANNUAL", label: "Anual" },
              { value: "ONE_TIME", label: "Avulso" },
              { value: "OTHER", label: "Outro" },
            ]}
            {...register("periodicity")}
          />
        </div>
        <UserPicker label="Responsavel" roles={["ADMIN", "COMMERCIAL", "TECHNICIAN"]} {...register("responsibleId")} />
        {contract && (
          <SelectInput
            label="Status"
            options={[
              { value: "ACTIVE", label: "Ativo" },
              { value: "EXPIRING_SOON", label: "Vencendo em breve" },
              { value: "EXPIRED", label: "Vencido" },
              { value: "CANCELED", label: "Cancelado" },
            ]}
            {...register("status")}
          />
        )}
        <TextareaInput label="Observacoes" rows={3} {...register("notes")} />
      </form>
    </Modal>
  );
}
