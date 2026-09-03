import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { listLaborResources, getLaborResource, createLaborResource, updateLaborResource, deleteLaborResource } from "./controller";

export const laborResourcesRouter = Router();

laborResourcesRouter.use(requireAuth);

laborResourcesRouter.get("/", listLaborResources);
laborResourcesRouter.get("/:id", getLaborResource);
// Mesmo padrao do almoxarifado: o cliente gerencia a propria mao de obra (self-service),
// so a exclusao fica restrita a ADMIN e ao proprio cliente dono do recurso.
laborResourcesRouter.post("/", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), createLaborResource);
laborResourcesRouter.patch("/:id", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), updateLaborResource);
laborResourcesRouter.delete("/:id", requireRole("ADMIN", "CLIENT"), deleteLaborResource);
