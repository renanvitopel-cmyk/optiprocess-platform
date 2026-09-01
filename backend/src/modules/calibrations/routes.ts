import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { uploadPdf } from "../../middleware/upload";
import {
  listCalibrations,
  getCalibration,
  getCalibrationHistory,
  createCalibration,
  updateCalibration,
  issueCalibration,
  reviseCalibration,
  setCalibrationVisibility,
  uploadCalibrationPdf,
  getCalibrationPdfUrl,
} from "./controller";

export const calibrationsRouter = Router();

calibrationsRouter.use(requireAuth);

calibrationsRouter.get("/", listCalibrations);
calibrationsRouter.get("/:id", getCalibration);
calibrationsRouter.get("/:id/history", getCalibrationHistory);
calibrationsRouter.get("/:id/pdf-url", getCalibrationPdfUrl);

calibrationsRouter.post("/", requireRole("ADMIN", "TECHNICIAN"), createCalibration);
calibrationsRouter.patch("/:id", requireRole("ADMIN", "TECHNICIAN"), updateCalibration);
calibrationsRouter.post("/:id/issue", requireRole("ADMIN", "TECHNICIAN"), issueCalibration);
calibrationsRouter.post("/:id/revise", requireRole("ADMIN", "TECHNICIAN"), reviseCalibration);
calibrationsRouter.patch("/:id/visibility", requireRole("ADMIN", "TECHNICIAN"), setCalibrationVisibility);
calibrationsRouter.post(
  "/:id/pdf",
  requireRole("ADMIN", "TECHNICIAN"),
  uploadPdf.single("file"),
  uploadCalibrationPdf,
);
