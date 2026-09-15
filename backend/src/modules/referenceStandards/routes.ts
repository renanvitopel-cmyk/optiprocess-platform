import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole, STAFF_ROLES } from "../../middleware/rbac";
import { uploadAny, uploadImage } from "../../middleware/upload";
import {
  listReferenceStandards,
  getReferenceStandard,
  createReferenceStandard,
  updateReferenceStandard,
  deleteReferenceStandard,
  uploadReferenceStandardPhoto,
  deleteReferenceStandardPhoto,
  listReferenceStandardCertificates,
  createReferenceStandardCertificate,
  deleteReferenceStandardCertificate,
  getReferenceStandardCertificateUrl,
} from "./controller";

export const referenceStandardsRouter = Router();

// Padroes de referencia sao equipamento interno da OptiProcess (nao tem clientId) -
// nunca visivel para CLIENT, mesmo com calibracao contratada.
referenceStandardsRouter.use(requireAuth, requireRole(...STAFF_ROLES));

referenceStandardsRouter.get("/", listReferenceStandards);
referenceStandardsRouter.get("/:id", getReferenceStandard);
referenceStandardsRouter.post("/", createReferenceStandard);
referenceStandardsRouter.patch("/:id", updateReferenceStandard);
referenceStandardsRouter.delete("/:id", deleteReferenceStandard);

referenceStandardsRouter.post("/:id/photo", uploadImage.single("file"), uploadReferenceStandardPhoto);
referenceStandardsRouter.delete("/:id/photo", deleteReferenceStandardPhoto);

referenceStandardsRouter.get("/:id/certificates", listReferenceStandardCertificates);
referenceStandardsRouter.post("/:id/certificates", uploadAny.single("file"), createReferenceStandardCertificate);
referenceStandardsRouter.delete("/:id/certificates/:certificateId", deleteReferenceStandardCertificate);
referenceStandardsRouter.get("/:id/certificates/:certificateId/url", getReferenceStandardCertificateUrl);
