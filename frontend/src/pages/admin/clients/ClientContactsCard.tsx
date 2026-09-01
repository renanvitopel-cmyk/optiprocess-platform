import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Star, Trash2 } from "lucide-react";
import type { ClientContact } from "../../../api/types";
import { addClientContact, deleteClientContact } from "../../../api/clients";
import { TextInput } from "../../../components/form/Field";
import { Modal } from "../../../components/Modal";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";

interface FormValues {
  name: string;
  role: string;
  email: string;
  phone: string;
  whatsapp: string;
}

export function ClientContactsCard({ clientId, contacts, canManage }: { clientId: string; contacts: ClientContact[]; canManage: boolean }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormValues>();

  async function onSubmit(values: FormValues) {
    try {
      await addClientContact(clientId, values);
      notify("success", "Contato adicionado.");
      reset();
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["client", clientId] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function handleRemove(contactId: string) {
    try {
      await deleteClientContact(clientId, contactId);
      queryClient.invalidateQueries({ queryKey: ["client", clientId] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-navy-900">Contatos</h2>
        {canManage && (
          <button type="button" className="btn-ghost btn-sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Adicionar
          </button>
        )}
      </div>

      {contacts.length === 0 ? (
        <p className="text-sm text-graphite-500">Nenhum contato cadastrado.</p>
      ) : (
        <ul className="space-y-3">
          {contacts.map((c) => (
            <li key={c.id} className="flex items-start justify-between text-sm">
              <div>
                <p className="flex items-center gap-1.5 font-medium text-graphite-800">
                  {c.isPrimary && <Star className="h-3.5 w-3.5 fill-safety-yellow text-safety-yellow" />}
                  {c.name}
                </p>
                <p className="text-xs text-graphite-500">{c.role}</p>
                <p className="text-xs text-graphite-500">{c.email || c.phone}</p>
              </div>
              {canManage && (
                <button type="button" onClick={() => handleRemove(c.id)} className="text-graphite-400 hover:text-safety-red" aria-label="Remover contato">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Novo contato" size="sm" footer={
        <>
          <button type="button" className="btn-outline" onClick={() => setOpen(false)}>Cancelar</button>
          <button type="submit" form="contact-form" className="btn-primary" disabled={isSubmitting}>Adicionar</button>
        </>
      }>
        <form id="contact-form" onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <TextInput label="Nome" required {...register("name", { required: true })} />
          <TextInput label="Cargo" {...register("role")} />
          <TextInput label="E-mail" type="email" {...register("email")} />
          <TextInput label="Telefone" {...register("phone")} />
          <TextInput label="WhatsApp" {...register("whatsapp")} />
        </form>
      </Modal>
    </div>
  );
}
