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
maintenanceWorkOrdersRouter.post("/", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), createMaintenanceWorkOrder);
maintenanceWorkOrdersRouter.patch("/:id", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), updateMaintenanceWorkOrder);
maintenanceWorkOrdersRouter.delete("/:id", requireRole("ADMIN", "CLIENT"), deleteMaintenanceWorkOrder);
maintenanceWorkOrdersRouter.post("/:id/start", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), startMaintenanceWorkOrder);
maintenanceWorkOrdersRouter.post("/:id/complete", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), completeMaintenanceWorkOrder);

maintenanceWorkOrdersRouter.patch("/:id/checklist/:itemId", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), updateChecklistItem);

maintenanceWorkOrdersRouter.post("/:id/parts", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), addWorkOrderPart);
maintenanceWorkOrdersRouter.delete("/:id/parts/:movementId", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), removeWorkOrderPart);

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
