import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole, CMMS_PLANNING_ROLES } from "../../middleware/rbac";
import {
  listMaintenancePlans,
  getMaintenancePlan,
  createMaintenancePlan,
  updateMaintenancePlan,
  deleteMaintenancePlan,
  generateWorkOrderFromPlan,
  runPlanGeneration,
  getMaintenancePlanIndicators,
  duplicateMaintenancePlan,
  atribuirAtivosAoPlano,
} from "./controller";

export const maintenancePlansRouter = Router();

maintenancePlansRouter.use(requireAuth, requireRole(...CMMS_PLANNING_ROLES));

maintenancePlansRouter.post("/gerar-vencidos", requireRole(...CMMS_PLANNING_ROLES), runPlanGeneration);
maintenancePlansRouter.get("/", listMaintenancePlans);
maintenancePlansRouter.get("/:id", getMaintenancePlan);
maintenancePlansRouter.get("/:id/indicators", getMaintenancePlanIndicators);
maintenancePlansRouter.post("/", requireRole(...CMMS_PLANNING_ROLES), createMaintenancePlan);
maintenancePlansRouter.patch("/:id", requireRole(...CMMS_PLANNING_ROLES), updateMaintenancePlan);
maintenancePlansRouter.delete("/:id", requireRole(...CMMS_PLANNING_ROLES), deleteMaintenancePlan);
maintenancePlansRouter.post("/:id/generate", requireRole(...CMMS_PLANNING_ROLES), generateWorkOrderFromPlan);
maintenancePlansRouter.post("/:id/duplicate", requireRole(...CMMS_PLANNING_ROLES), duplicateMaintenancePlan);
maintenancePlansRouter.post("/:id/ativos", requireRole(...CMMS_PLANNING_ROLES), atribuirAtivosAoPlano);
