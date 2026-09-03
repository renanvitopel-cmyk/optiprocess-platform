import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import {
  listMaintenancePlanTemplates,
  getMaintenancePlanTemplate,
  createMaintenancePlanTemplate,
  updateMaintenancePlanTemplate,
  deleteMaintenancePlanTemplate,
  applyMaintenancePlanTemplate,
} from "./controller";

export const maintenancePlanTemplatesRouter = Router();

maintenancePlanTemplatesRouter.use(requireAuth, requireRole("ADMIN", "TECHNICIAN", "COMMERCIAL", "CLIENT"));

maintenancePlanTemplatesRouter.get("/", listMaintenancePlanTemplates);
maintenancePlanTemplatesRouter.get("/:id", getMaintenancePlanTemplate);
maintenancePlanTemplatesRouter.post("/", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), createMaintenancePlanTemplate);
maintenancePlanTemplatesRouter.patch("/:id", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), updateMaintenancePlanTemplate);
maintenancePlanTemplatesRouter.delete("/:id", requireRole("ADMIN", "CLIENT"), deleteMaintenancePlanTemplate);
maintenancePlanTemplatesRouter.post("/:id/apply", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), applyMaintenancePlanTemplate);
