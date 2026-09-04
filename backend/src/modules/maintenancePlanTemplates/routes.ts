import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole, CMMS_ROLES } from "../../middleware/rbac";
import {
  listMaintenancePlanTemplates,
  getMaintenancePlanTemplate,
  createMaintenancePlanTemplate,
  updateMaintenancePlanTemplate,
  deleteMaintenancePlanTemplate,
  applyMaintenancePlanTemplate,
} from "./controller";

export const maintenancePlanTemplatesRouter = Router();

maintenancePlanTemplatesRouter.use(requireAuth, requireRole(...CMMS_ROLES));

maintenancePlanTemplatesRouter.get("/", listMaintenancePlanTemplates);
maintenancePlanTemplatesRouter.get("/:id", getMaintenancePlanTemplate);
maintenancePlanTemplatesRouter.post("/", requireRole(...CMMS_ROLES), createMaintenancePlanTemplate);
maintenancePlanTemplatesRouter.patch("/:id", requireRole(...CMMS_ROLES), updateMaintenancePlanTemplate);
maintenancePlanTemplatesRouter.delete("/:id", requireRole(...CMMS_ROLES), deleteMaintenancePlanTemplate);
maintenancePlanTemplatesRouter.post("/:id/apply", requireRole(...CMMS_ROLES), applyMaintenancePlanTemplate);
