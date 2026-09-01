import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { STAFF_ROLES, requireRole } from "../../middleware/rbac";
import { uploadAny } from "../../middleware/upload";
import { listAttachments, uploadAttachment, getAttachmentUrl, deleteAttachment } from "./controller";

export const attachmentsRouter = Router();

attachmentsRouter.use(requireAuth, requireRole(...STAFF_ROLES));

attachmentsRouter.get("/", listAttachments);
attachmentsRouter.post("/", uploadAny.single("file"), uploadAttachment);
attachmentsRouter.get("/:id/url", getAttachmentUrl);
attachmentsRouter.delete("/:id", requireRole("ADMIN"), deleteAttachment);
