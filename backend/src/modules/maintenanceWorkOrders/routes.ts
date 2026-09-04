import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole, CMMS_ROLES } from "../../middleware/rbac";
import { uploadAny } from "../../middleware/upload";
import {
  listMaintenanceWorkOrders,
  getMaintenanceWorkOrder,
  createMaintenanceWorkOrder,
  updateMaintenanceWorkOrder,
  deleteMaintenanceWorkOrder,
  startMaintenanceWorkOrder,
  completeMaintenanceWorkOrder,
  updateChecklistItem,
  addWorkOrderPart,
  removeWorkOrderPart,
  addWorkOrderAssignee,
  removeWorkOrderAssignee,
  addWorkOrderLabor,
  removeWorkOrderLabor,
  addWorkOrderThirdPartyService,
  removeWorkOrderThirdPartyService,
  addWorkOrderReservation,
  releaseWorkOrderReservation,
  consumeWorkOrderReservation,
  addWorkOrderStoppage,
  updateWorkOrderStoppage,
  removeWorkOrderStoppage,
  listWorkOrderAttachmentsRoute,
  uploadWorkOrderAttachment,
  deleteWorkOrderAttachment,
  getWorkOrderAttachmentUrl,
  getMaintenanceDashboard,
  getFailureAnalysis,
  listFailureRecords,
  getMaintenanceSchedule,
  scheduleMaintenanceWorkOrder,
} from "./controller";

export const maintenanceWorkOrdersRouter = Router();

maintenanceWorkOrdersRouter.use(requireAuth, requireRole(...CMMS_ROLES));

maintenanceWorkOrdersRouter.get("/dashboard", getMaintenanceDashboard);
maintenanceWorkOrdersRouter.get("/failure-analysis", getFailureAnalysis);
maintenanceWorkOrdersRouter.get("/registros-de-falha", listFailureRecords);
maintenanceWorkOrdersRouter.get("/schedule", getMaintenanceSchedule);
maintenanceWorkOrdersRouter.get("/", listMaintenanceWorkOrders);
maintenanceWorkOrdersRouter.get("/:id", getMaintenanceWorkOrder);
maintenanceWorkOrdersRouter.post("/", requireRole(...CMMS_ROLES), createMaintenanceWorkOrder);
maintenanceWorkOrdersRouter.patch("/:id", requireRole(...CMMS_ROLES), updateMaintenanceWorkOrder);
maintenanceWorkOrdersRouter.delete("/:id", requireRole(...CMMS_ROLES), deleteMaintenanceWorkOrder);
maintenanceWorkOrdersRouter.post("/:id/start", requireRole(...CMMS_ROLES), startMaintenanceWorkOrder);
maintenanceWorkOrdersRouter.post("/:id/complete", requireRole(...CMMS_ROLES), completeMaintenanceWorkOrder);

maintenanceWorkOrdersRouter.patch("/:id/schedule", requireRole(...CMMS_ROLES), scheduleMaintenanceWorkOrder);

maintenanceWorkOrdersRouter.patch("/:id/checklist/:itemId", requireRole(...CMMS_ROLES), updateChecklistItem);

maintenanceWorkOrdersRouter.post("/:id/parts", requireRole(...CMMS_ROLES), addWorkOrderPart);
maintenanceWorkOrdersRouter.delete("/:id/parts/:movementId", requireRole(...CMMS_ROLES), removeWorkOrderPart);

maintenanceWorkOrdersRouter.post("/:id/assignees", requireRole(...CMMS_ROLES), addWorkOrderAssignee);
maintenanceWorkOrdersRouter.delete("/:id/assignees/:assigneeId", requireRole(...CMMS_ROLES), removeWorkOrderAssignee);

maintenanceWorkOrdersRouter.post("/:id/labor", requireRole(...CMMS_ROLES), addWorkOrderLabor);
maintenanceWorkOrdersRouter.delete("/:id/labor/:entryId", requireRole(...CMMS_ROLES), removeWorkOrderLabor);

maintenanceWorkOrdersRouter.post("/:id/third-party-services", requireRole(...CMMS_ROLES), addWorkOrderThirdPartyService);
maintenanceWorkOrdersRouter.delete("/:id/third-party-services/:serviceId", requireRole(...CMMS_ROLES), removeWorkOrderThirdPartyService);

maintenanceWorkOrdersRouter.post("/:id/reservations", requireRole(...CMMS_ROLES), addWorkOrderReservation);
maintenanceWorkOrdersRouter.post("/:id/reservations/:reservationId/release", requireRole(...CMMS_ROLES), releaseWorkOrderReservation);
maintenanceWorkOrdersRouter.post("/:id/reservations/:reservationId/consume", requireRole(...CMMS_ROLES), consumeWorkOrderReservation);

maintenanceWorkOrdersRouter.post("/:id/stoppages", requireRole(...CMMS_ROLES), addWorkOrderStoppage);
maintenanceWorkOrdersRouter.patch("/:id/stoppages/:stoppageId", requireRole(...CMMS_ROLES), updateWorkOrderStoppage);
maintenanceWorkOrdersRouter.delete("/:id/stoppages/:stoppageId", requireRole(...CMMS_ROLES), removeWorkOrderStoppage);

maintenanceWorkOrdersRouter.get("/:id/attachments", listWorkOrderAttachmentsRoute);
maintenanceWorkOrdersRouter.get("/:id/attachments/:attachmentId/url", getWorkOrderAttachmentUrl);
maintenanceWorkOrdersRouter.post(
  "/:id/attachments",
  requireRole(...CMMS_ROLES),
  uploadAny.single("file"),
  uploadWorkOrderAttachment,
);
maintenanceWorkOrdersRouter.delete(
  "/:id/attachments/:attachmentId",
  requireRole(...CMMS_ROLES),
  deleteWorkOrderAttachment,
);
