import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { uploadPdf } from "../../middleware/upload";
import {
  listTechnicalReports,
  getTechnicalReport,
  createTechnicalReport,
  updateTechnicalReport,
  deleteTechnicalReport,
  issueTechnicalReport,
  setTechnicalReportVisibility,
  uploadTechnicalReportPdf,
  getTechnicalReportPdfUrl,
} from "./controller";

export const technicalReportsRouter = Router();

technicalReportsRouter.use(requireAuth);

technicalReportsRouter.get("/", listTechnicalReports);
technicalReportsRouter.get("/:id", getTechnicalReport);
technicalReportsRouter.get("/:id/pdf-url", getTechnicalReportPdfUrl);

technicalReportsRouter.post("/", requireRole("ADMIN", "TECHNICIAN"), createTechnicalReport);
technicalReportsRouter.patch("/:id", requireRole("ADMIN", "TECHNICIAN"), updateTechnicalReport);
technicalReportsRouter.delete("/:id", requireRole("ADMIN"), deleteTechnicalReport);
technicalReportsRouter.post("/:id/issue", requireRole("ADMIN", "TECHNICIAN"), issueTechnicalReport);
technicalReportsRouter.patch("/:id/visibility", requireRole("ADMIN", "TECHNICIAN"), setTechnicalReportVisibility);
technicalReportsRouter.post(
  "/:id/pdf",
  requireRole("ADMIN", "TECHNICIAN"),
  uploadPdf.single("file"),
  uploadTechnicalReportPdf,
);
