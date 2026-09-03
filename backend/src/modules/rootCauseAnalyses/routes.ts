import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { uploadAny } from "../../middleware/upload";
import {
  listRootCauseAnalyses,
  getRootCauseAnalysis,
  createRootCauseAnalysis,
  updateRootCauseAnalysis,
  deleteRootCauseAnalysis,
  listRcaAttachmentsRoute,
  uploadRcaAttachment,
  deleteRcaAttachment,
  getRcaAttachmentUrl,
} from "./controller";

export const rootCauseAnalysesRouter = Router();

rootCauseAnalysesRouter.use(requireAuth);

rootCauseAnalysesRouter.get("/", listRootCauseAnalyses);
rootCauseAnalysesRouter.get("/:id", getRootCauseAnalysis);
rootCauseAnalysesRouter.post("/", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), createRootCauseAnalysis);
rootCauseAnalysesRouter.patch("/:id", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), updateRootCauseAnalysis);
rootCauseAnalysesRouter.delete("/:id", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), deleteRootCauseAnalysis);

rootCauseAnalysesRouter.get("/:id/attachments", listRcaAttachmentsRoute);
rootCauseAnalysesRouter.get("/:id/attachments/:attachmentId/url", getRcaAttachmentUrl);
rootCauseAnalysesRouter.post(
  "/:id/attachments",
  requireRole("ADMIN", "TECHNICIAN", "CLIENT"),
  uploadAny.single("file"),
  uploadRcaAttachment,
);
rootCauseAnalysesRouter.delete(
  "/:id/attachments/:attachmentId",
  requireRole("ADMIN", "TECHNICIAN", "CLIENT"),
  deleteRcaAttachment,
);
