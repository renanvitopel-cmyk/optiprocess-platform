import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "../../../components/Modal";
import { TextInput, SelectInput, TextareaInput } from "../../../components/form/Field";
import { createClient, updateClient } from "../../../api/clients";
import type { Client } from "../../../api/types";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";

const schema = z.object({
  companyName: z.string().min(2, "Informe a razao social."),
  tradeName: z.string().optional(),
  cnpj: z.string().optional(),
  stateRegistration: z.string().optional(),
  addressStreet: z.string().optional(),
  addressNumber: z.string().optional(),
  addressDistrict: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  addressZip: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email("E-mail invalido.").optional().or(z.literal("")),
  technicalContactName: z.string().optional(),
  commercialContactName: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "PROSPECT"]),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface ClientFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (client: Client) => void;
  client?: Client;
}

export function ClientFormModal({ open, onClose, onSaved, client }: ClientFormModalProps) {
  const { notify } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { status: "PROSPECT" } });

  useEffect(() => {
    if (open) {
      reset(
        client
          ? {
              companyName: client.companyName,
              tradeName: client.tradeName ?? "",
              cnpj: client.cnpj ?? "",
              stateRegistration: client.stateRegistration ?? "",
              addressStreet: client.addressStreet ?? "",
              addressNumber: client.addressNumber ?? "",
              addressDistrict: client.addressDistrict ?? "",
              addressCity: client.addressCity ?? "",
              addressState: client.addressState ?? "",
              addressZip: client.addressZip ?? "",
              phone: client.phone ?? "",
              whatsapp: client.whatsapp ?? "",
              email: client.email ?? "",
              technicalContactName: client.technicalContactName ?? "",
              commercialContactName: client.commercialContactName ?? "",
              status: client.status,
              notes: client.notes ?? "",
            }
          : { status: "PROSPECT" },
      );
    }
  }, [open, client, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const saved = client ? await updateClient(client.id, values) : await createClient(values);
      notify("success", client ? "Cliente atualizado." : "Cliente cadastrado.");
      onSaved(saved);
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={client ? "Editar cliente" : "Novo cliente"} size="lg" footer={
      <>
        <button type="button" className="btn-outline" onClick={onClose}>Cancelar</button>
        <button type="submit" form="client-form" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar"}
        </button>
      </>
    }>
      <form id="client-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Razao social" required error={errors.companyName?.message} {...register("companyName")} />
          <TextInput label="Nome fantasia" {...register("tradeName")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextInput label="CNPJ" {...register("cnpj")} />
          <TextInput label="Inscricao estadual" {...register("stateRegistration")} />
          <SelectInput
            label="Status"
            options={[
              { value: "PROSPECT", label: "Prospecto" },
              { value: "ACTIVE", label: "Ativo" },
              { value: "INACTIVE", label: "Inativo" },
            ]}
            {...register("status")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <TextInput label="Endereco" className="sm:col-span-2" {...register("addressStreet")} />
          <TextInput label="Numero" {...register("addressNumber")} />
          <TextInput label="CEP" {...register("addressZip")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextInput label="Bairro" {...register("addressDistrict")} />
          <TextInput label="Cidade" {...register("addressCity")} />
          <TextInput label="UF" maxLength={2} {...register("addressState")} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <TextInput label="Telefone" {...register("phone")} />
          <TextInput label="WhatsApp" {...register("whatsapp")} />
          <TextInput label="E-mail" type="email" error={errors.email?.message} {...register("email")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Responsavel tecnico" {...register("technicalContactName")} />
          <TextInput label="Responsavel comercial" {...register("commercialContactName")} />
        </div>
        <TextareaInput label="Observacoes" rows={3} {...register("notes")} />
      </form>
    </Modal>
  );
}
