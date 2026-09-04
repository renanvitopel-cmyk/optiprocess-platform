import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole, CMMS_ROLES } from "../../middleware/rbac";
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

rootCauseAnalysesRouter.use(requireAuth, requireRole(...CMMS_ROLES));

rootCauseAnalysesRouter.get("/", listRootCauseAnalyses);
rootCauseAnalysesRouter.get("/:id", getRootCauseAnalysis);
rootCauseAnalysesRouter.post("/", requireRole(...CMMS_ROLES), createRootCauseAnalysis);
rootCauseAnalysesRouter.patch("/:id", requireRole(...CMMS_ROLES), updateRootCauseAnalysis);
rootCauseAnalysesRouter.delete("/:id", requireRole(...CMMS_ROLES), deleteRootCauseAnalysis);

rootCauseAnalysesRouter.get("/:id/attachments", listRcaAttachmentsRoute);
rootCauseAnalysesRouter.get("/:id/attachments/:attachmentId/url", getRcaAttachmentUrl);
rootCauseAnalysesRouter.post(
  "/:id/attachments",
  requireRole(...CMMS_ROLES),
  uploadAny.single("file"),
  uploadRcaAttachment,
);
rootCauseAnalysesRouter.delete(
  "/:id/attachments/:attachmentId",
  requireRole(...CMMS_ROLES),
  deleteRcaAttachment,
);
