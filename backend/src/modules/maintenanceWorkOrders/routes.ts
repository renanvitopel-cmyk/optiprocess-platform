import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
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
} from "./controller";

export const maintenanceWorkOrdersRouter = Router();

maintenanceWorkOrdersRouter.use(requireAuth);

maintenanceWorkOrdersRouter.get("/dashboard", getMaintenanceDashboard);
maintenanceWorkOrdersRouter.get("/", listMaintenanceWorkOrders);
maintenanceWorkOrdersRouter.get("/:id", getMaintenanceWorkOrder);
maintenanceWorkOrdersRouter.post("/", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), createMaintenanceWorkOrder);
maintenanceWorkOrdersRouter.patch("/:id", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), updateMaintenanceWorkOrder);
maintenanceWorkOrdersRouter.delete("/:id", requireRole("ADMIN", "CLIENT"), deleteMaintenanceWorkOrder);
maintenanceWorkOrdersRouter.post("/:id/start", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), startMaintenanceWorkOrder);
maintenanceWorkOrdersRouter.post("/:id/complete", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), completeMaintenanceWorkOrder);

maintenanceWorkOrdersRouter.patch("/:id/checklist/:itemId", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), updateChecklistItem);

maintenanceWorkOrdersRouter.post("/:id/parts", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), addWorkOrderPart);
maintenanceWorkOrdersRouter.delete("/:id/parts/:movementId", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), removeWorkOrderPart);

maintenanceWorkOrdersRouter.post("/:id/labor", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), addWorkOrderLabor);
maintenanceWorkOrdersRouter.delete("/:id/labor/:entryId", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), removeWorkOrderLabor);

maintenanceWorkOrdersRouter.post("/:id/third-party-services", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), addWorkOrderThirdPartyService);
maintenanceWorkOrdersRouter.delete("/:id/third-party-services/:serviceId", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), removeWorkOrderThirdPartyService);

maintenanceWorkOrdersRouter.post("/:id/reservations", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), addWorkOrderReservation);
maintenanceWorkOrdersRouter.post("/:id/reservations/:reservationId/release", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), releaseWorkOrderReservation);
maintenanceWorkOrdersRouter.post("/:id/reservations/:reservationId/consume", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), consumeWorkOrderReservation);

maintenanceWorkOrdersRouter.post("/:id/stoppages", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), addWorkOrderStoppage);
maintenanceWorkOrdersRouter.patch("/:id/stoppages/:stoppageId", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), updateWorkOrderStoppage);
maintenanceWorkOrdersRouter.delete("/:id/stoppages/:stoppageId", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), removeWorkOrderStoppage);

maintenanceWorkOrdersRouter.get("/:id/attachments", listWorkOrderAttachmentsRoute);
maintenanceWorkOrdersRouter.get("/:id/attachments/:attachmentId/url", getWorkOrderAttachmentUrl);
maintenanceWorkOrdersRouter.post(
  "/:id/attachments",
  requireRole("ADMIN", "TECHNICIAN", "CLIENT"),
  uploadAny.single("file"),
  uploadWorkOrderAttachment,
);
maintenanceWorkOrdersRouter.delete(
  "/:id/attachments/:attachmentId",
  requireRole("ADMIN", "TECHNICIAN", "CLIENT"),
  deleteWorkOrderAttachment,
);
