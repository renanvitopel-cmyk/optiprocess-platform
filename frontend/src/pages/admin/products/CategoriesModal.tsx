import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { createProductCategory, deleteProductCategory, listProductCategories, updateProductCategory } from "../../../api/products";
import { Modal } from "../../../components/Modal";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";

export function CategoriesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const { data: categories } = useQuery({ queryKey: ["product-categories"], queryFn: listProductCategories, enabled: open });

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["product-categories"] });
    queryClient.invalidateQueries({ queryKey: ["public-categories"] });
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    try {
      await createProductCategory(newName.trim());
      setNewName("");
      invalidate();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function handleRename(id: string) {
    try {
      await updateProductCategory(id, editingName.trim());
      setEditingId(null);
      invalidate();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteProductCategory(id);
      invalidate();
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Categorias de produtos" size="sm">
      <ul className="mb-4 space-y-1.5">
        {categories?.map((cat) => (
          <li key={cat.id} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-gray-50">
            {editingId === cat.id ? (
              <>
                <input className="input" value={editingName} onChange={(e) => setEditingName(e.target.value)} />
                <div className="ml-2 flex gap-1">
                  <button onClick={() => handleRename(cat.id)} className="text-safety-green" aria-label="Confirmar"><Check className="h-4 w-4" /></button>
                  <button onClick={() => setEditingId(null)} className="text-graphite-400" aria-label="Cancelar"><X className="h-4 w-4" /></button>
                </div>
              </>
            ) : (
              <>
                <span className="text-graphite-700">{cat.name} <span className="text-xs text-graphite-400">({cat._count?.products ?? 0})</span></span>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingId(cat.id); setEditingName(cat.name); }} className="text-graphite-400 hover:text-navy-700" aria-label="Editar">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(cat.id)} className="text-graphite-400 hover:text-safety-red" aria-label="Remover">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input className="input" placeholder="Nova categoria" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button className="btn-ghost btn-sm" onClick={handleCreate}><Plus className="h-4 w-4" /></button>
      </div>
    </Modal>
  );
}
