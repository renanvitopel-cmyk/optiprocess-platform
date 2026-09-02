import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { STAFF_ROLES, requireRole } from "../../middleware/rbac";
import { listSpareParts, getSparePart, createSparePart, updateSparePart, deleteSparePart, addSparePartMovement } from "./controller";

export const sparePartsRouter = Router();

// Almoxarifado e' recurso interno da empresa, nao por cliente - cliente nunca acessa,
// mesmo com CMMS contratado (so ve o que foi consumido na propria OS).
sparePartsRouter.use(requireAuth, requireRole(...STAFF_ROLES));

sparePartsRouter.get("/", listSpareParts);
sparePartsRouter.get("/:id", getSparePart);
sparePartsRouter.post("/", createSparePart);
sparePartsRouter.patch("/:id", updateSparePart);
sparePartsRouter.delete("/:id", requireRole("ADMIN"), deleteSparePart);
sparePartsRouter.post("/:id/movements", addSparePartMovement);
