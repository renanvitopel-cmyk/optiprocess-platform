import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole, CMMS_PLANNING_ROLES } from "../../middleware/rbac";
import { uploadAny } from "../../middleware/upload";
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
  listMaintenancePlanAttachments,
  uploadMaintenancePlanAttachment,
  deleteMaintenancePlanAttachment,
  getMaintenancePlanAttachmentUrl,
  getAutomationStatus,
  updateAutomationStatus,
} from "./controller";

export const maintenancePlansRouter = Router();

maintenancePlansRouter.use(requireAuth, requireRole(...CMMS_PLANNING_ROLES));

maintenancePlansRouter.post("/gerar-vencidos", requireRole(...CMMS_PLANNING_ROLES), runPlanGeneration);
// Antes de "/:id", senao "automacao" seria lido como um id de plano.
maintenancePlansRouter.get("/automacao", getAutomationStatus);
maintenancePlansRouter.patch("/automacao", requireRole(...CMMS_PLANNING_ROLES), updateAutomationStatus);
maintenancePlansRouter.get("/", listMaintenancePlans);
maintenancePlansRouter.get("/:id", getMaintenancePlan);
maintenancePlansRouter.get("/:id/indicators", getMaintenancePlanIndicators);
maintenancePlansRouter.post("/", requireRole(...CMMS_PLANNING_ROLES), createMaintenancePlan);
maintenancePlansRouter.patch("/:id", requireRole(...CMMS_PLANNING_ROLES), updateMaintenancePlan);
maintenancePlansRouter.delete("/:id", requireRole(...CMMS_PLANNING_ROLES), deleteMaintenancePlan);
maintenancePlansRouter.post("/:id/generate", requireRole(...CMMS_PLANNING_ROLES), generateWorkOrderFromPlan);
maintenancePlansRouter.post("/:id/duplicate", requireRole(...CMMS_PLANNING_ROLES), duplicateMaintenancePlan);
maintenancePlansRouter.post("/:id/ativos", requireRole(...CMMS_PLANNING_ROLES), atribuirAtivosAoPlano);
maintenancePlansRouter.get("/:id/attachments", listMaintenancePlanAttachments);
maintenancePlansRouter.get("/:id/attachments/:attachmentId/url", getMaintenancePlanAttachmentUrl);
maintenancePlansRouter.post("/:id/attachments", requireRole(...CMMS_PLANNING_ROLES), uploadAny.single("file"), uploadMaintenancePlanAttachment);
maintenancePlansRouter.delete("/:id/attachments/:attachmentId", requireRole(...CMMS_PLANNING_ROLES), deleteMaintenancePlanAttachment);
