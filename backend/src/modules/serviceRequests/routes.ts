import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { uploadAny } from "../../middleware/upload";
import {
  listServiceRequests,
  getServiceRequest,
  createServiceRequest,
  updateServiceRequest,
  deleteServiceRequest,
  triageServiceRequest,
  convertServiceRequest,
  listServiceRequestAttachmentsRoute,
  uploadServiceRequestAttachment,
  deleteServiceRequestAttachment,
  getServiceRequestAttachmentUrl,
} from "./controller";

export const serviceRequestsRouter = Router();

// Qualquer usuario autenticado (staff ou cliente) pode abrir uma solicitacao - e' a
// porta de entrada simples do CMMS. Triagem e conversao em OS ficam com a equipe interna.
serviceRequestsRouter.use(requireAuth);

serviceRequestsRouter.get("/", listServiceRequests);
serviceRequestsRouter.get("/:id", getServiceRequest);
serviceRequestsRouter.post("/", requireRole("ADMIN", "TECHNICIAN", "COMMERCIAL", "CLIENT"), createServiceRequest);
serviceRequestsRouter.patch("/:id", requireRole("ADMIN", "TECHNICIAN", "COMMERCIAL", "CLIENT"), updateServiceRequest);
serviceRequestsRouter.delete("/:id", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), deleteServiceRequest);

serviceRequestsRouter.post("/:id/triage", requireRole("ADMIN", "TECHNICIAN"), triageServiceRequest);
serviceRequestsRouter.post("/:id/convert", requireRole("ADMIN", "TECHNICIAN"), convertServiceRequest);

serviceRequestsRouter.get("/:id/attachments", listServiceRequestAttachmentsRoute);
serviceRequestsRouter.get("/:id/attachments/:attachmentId/url", getServiceRequestAttachmentUrl);
serviceRequestsRouter.post(
  "/:id/attachments",
  requireRole("ADMIN", "TECHNICIAN", "COMMERCIAL", "CLIENT"),
  uploadAny.single("file"),
  uploadServiceRequestAttachment,
);
serviceRequestsRouter.delete(
  "/:id/attachments/:attachmentId",
  requireRole("ADMIN", "TECHNICIAN", "COMMERCIAL", "CLIENT"),
  deleteServiceRequestAttachment,
);
