import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { listSpareParts, getSparePart, createSparePart, updateSparePart, deleteSparePart, addSparePartMovement } from "./controller";

export const sparePartsRouter = Router();

// Almoxarifado e' do cliente, nao um estoque unico da OptiProcess: o cliente cadastra,
// edita e movimenta as proprias pecas (mesmo padrao ja usado para o Ativo/TAG), sempre
// que tiver CMMS_MAINTENANCE contratado. So a exclusao fica restrita a equipe (ADMIN).
sparePartsRouter.use(requireAuth);

sparePartsRouter.get("/", listSpareParts);
sparePartsRouter.get("/:id", getSparePart);
sparePartsRouter.post("/", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), createSparePart);
sparePartsRouter.patch("/:id", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), updateSparePart);
sparePartsRouter.delete("/:id", requireRole("ADMIN"), deleteSparePart);
sparePartsRouter.post("/:id/movements", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), addSparePartMovement);
