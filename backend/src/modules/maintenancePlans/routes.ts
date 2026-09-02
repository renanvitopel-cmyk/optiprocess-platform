import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import {
  listMaintenancePlans,
  getMaintenancePlan,
  createMaintenancePlan,
  updateMaintenancePlan,
  deleteMaintenancePlan,
  generateWorkOrderFromPlan,
} from "./controller";

export const maintenancePlansRouter = Router();

maintenancePlansRouter.use(requireAuth);

maintenancePlansRouter.get("/", listMaintenancePlans);
maintenancePlansRouter.get("/:id", getMaintenancePlan);
maintenancePlansRouter.post("/", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), createMaintenancePlan);
maintenancePlansRouter.patch("/:id", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), updateMaintenancePlan);
maintenancePlansRouter.delete("/:id", requireRole("ADMIN", "CLIENT"), deleteMaintenancePlan);
maintenancePlansRouter.post("/:id/generate", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), generateWorkOrderFromPlan);
