import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole, CMMS_ROLES } from "../../middleware/rbac";
import { listSpareParts, getSparePart, createSparePart, updateSparePart, deleteSparePart, addSparePartMovement, getSparePartAlerts, getSparePartHistory } from "./controller";

export const sparePartsRouter = Router();

// Almoxarifado e' do cliente, nao um estoque unico da OptiProcess: o cliente cadastra,
// edita e movimenta as proprias pecas (mesmo padrao ja usado para o Ativo/TAG), sempre
// que tiver CMMS_MAINTENANCE contratado. So a exclusao fica restrita a equipe (ADMIN).
sparePartsRouter.use(requireAuth, requireRole(...CMMS_ROLES));

// Rota fixa antes da com :id, senao "alertas" seria lido como id de peca.
sparePartsRouter.get("/alertas", getSparePartAlerts);
sparePartsRouter.get("/", listSpareParts);
sparePartsRouter.get("/:id", getSparePart);
sparePartsRouter.get("/:id/historico", getSparePartHistory);
sparePartsRouter.post("/", requireRole(...CMMS_ROLES), createSparePart);
sparePartsRouter.patch("/:id", requireRole(...CMMS_ROLES), updateSparePart);
sparePartsRouter.delete("/:id", requireRole("ADMIN"), deleteSparePart);
sparePartsRouter.post("/:id/movements", requireRole(...CMMS_ROLES), addSparePartMovement);
