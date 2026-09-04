import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole, CMMS_ROLES } from "../../middleware/rbac";
import { listLaborResources, getLaborResource, createLaborResource, updateLaborResource, deleteLaborResource } from "./controller";

export const laborResourcesRouter = Router();

laborResourcesRouter.use(requireAuth, requireRole(...CMMS_ROLES));

laborResourcesRouter.get("/", listLaborResources);
laborResourcesRouter.get("/:id", getLaborResource);
// Mesmo padrao do almoxarifado: o cliente gerencia a propria mao de obra (self-service),
// so a exclusao fica restrita a ADMIN e ao proprio cliente dono do recurso.
laborResourcesRouter.post("/", requireRole(...CMMS_ROLES), createLaborResource);
laborResourcesRouter.patch("/:id", requireRole(...CMMS_ROLES), updateLaborResource);
laborResourcesRouter.delete("/:id", requireRole(...CMMS_ROLES), deleteLaborResource);
