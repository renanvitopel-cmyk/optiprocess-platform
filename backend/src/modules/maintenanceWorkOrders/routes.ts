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
maintenanceWorkOrdersRouter.post("/", requireRole("ADMIN", "TECHNICIAN"), createMaintenanceWorkOrder);
maintenanceWorkOrdersRouter.patch("/:id", requireRole("ADMIN", "TECHNICIAN"), updateMaintenanceWorkOrder);
maintenanceWorkOrdersRouter.delete("/:id", requireRole("ADMIN"), deleteMaintenanceWorkOrder);
maintenanceWorkOrdersRouter.post("/:id/start", requireRole("ADMIN", "TECHNICIAN"), startMaintenanceWorkOrder);
maintenanceWorkOrdersRouter.post("/:id/complete", requireRole("ADMIN", "TECHNICIAN"), completeMaintenanceWorkOrder);

maintenanceWorkOrdersRouter.patch("/:id/checklist/:itemId", requireRole("ADMIN", "TECHNICIAN"), updateChecklistItem);

maintenanceWorkOrdersRouter.post("/:id/parts", requireRole("ADMIN", "TECHNICIAN"), addWorkOrderPart);
maintenanceWorkOrdersRouter.delete("/:id/parts/:movementId", requireRole("ADMIN", "TECHNICIAN"), removeWorkOrderPart);

maintenanceWorkOrdersRouter.get("/:id/attachments", listWorkOrderAttachmentsRoute);
maintenanceWorkOrdersRouter.get("/:id/attachments/:attachmentId/url", getWorkOrderAttachmentUrl);
maintenanceWorkOrdersRouter.post(
  "/:id/attachments",
  requireRole("ADMIN", "TECHNICIAN"),
  uploadAny.single("file"),
  uploadWorkOrderAttachment,
);
maintenanceWorkOrdersRouter.delete(
  "/:id/attachments/:attachmentId",
  requireRole("ADMIN", "TECHNICIAN"),
  deleteWorkOrderAttachment,
);
