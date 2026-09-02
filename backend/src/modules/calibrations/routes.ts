import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { uploadAny } from "../../middleware/upload";
import {
  listCalibrations,
  getCalibration,
  getCalibrationHistory,
  createCalibration,
  updateCalibration,
  issueCalibration,
  regenerateCertificatePdf,
  reviseCalibration,
  setCalibrationVisibility,
  uploadCalibrationAttachment,
  listCalibrationAttachmentsRoute,
  deleteCalibrationAttachment,
  getCalibrationAttachmentUrl,
  getCalibrationPdfUrl,
} from "./controller";

export const calibrationsRouter = Router();

calibrationsRouter.use(requireAuth);

calibrationsRouter.get("/", listCalibrations);
calibrationsRouter.get("/:id", getCalibration);
calibrationsRouter.get("/:id/history", getCalibrationHistory);
calibrationsRouter.get("/:id/pdf-url", getCalibrationPdfUrl);

// Registro de campo (fotos e anexos): leitura tambem pelo portal do cliente,
// que enxerga apenas certificados emitidos e liberados.
calibrationsRouter.get("/:id/attachments", listCalibrationAttachmentsRoute);
calibrationsRouter.get("/:id/attachments/:attachmentId/url", getCalibrationAttachmentUrl);

calibrationsRouter.post("/", requireRole("ADMIN", "TECHNICIAN"), createCalibration);
calibrationsRouter.patch("/:id", requireRole("ADMIN", "TECHNICIAN"), updateCalibration);
calibrationsRouter.post("/:id/issue", requireRole("ADMIN", "TECHNICIAN"), issueCalibration);
calibrationsRouter.post("/:id/regenerate-pdf", requireRole("ADMIN", "TECHNICIAN"), regenerateCertificatePdf);
calibrationsRouter.post("/:id/revise", requireRole("ADMIN", "TECHNICIAN"), reviseCalibration);
calibrationsRouter.patch("/:id/visibility", requireRole("ADMIN", "TECHNICIAN"), setCalibrationVisibility);

calibrationsRouter.post(
  "/:id/attachments",
  requireRole("ADMIN", "TECHNICIAN"),
  uploadAny.single("file"),
  uploadCalibrationAttachment,
);
calibrationsRouter.delete(
  "/:id/attachments/:attachmentId",
  requireRole("ADMIN", "TECHNICIAN"),
  deleteCalibrationAttachment,
);
