import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole, CMMS_PLANNING_ROLES, CMMS_ADMIN_ROLES } from "../../middleware/rbac";
import { uploadAny, uploadImage } from "../../middleware/upload";
import {
  listInstruments,
  getInstrument,
  createInstrument,
  updateInstrument,
  deleteInstrument,
  getInstrumentRemovalImpact,
  listInstrumentAttachmentsRoute,
  uploadInstrumentAttachment,
  uploadInstrumentPhoto,
  deleteInstrumentPhoto,
  deleteInstrumentAttachment,
  getInstrumentAttachmentUrl,
} from "./controller";

export const instrumentsRouter = Router();

instrumentsRouter.use(requireAuth);

// Ler a lista de ativos e' aberto a qualquer usuario da empresa (o clientScopeFilter ja
// limita a propria).
instrumentsRouter.get("/", listInstruments);
instrumentsRouter.get("/:id", getInstrument);
// CLIENT tambem pode cadastrar/editar os proprios ativos (o TAG e cadastrado pelo cliente
// ou pela OptiProcess); o controller forca clientId para a propria empresa quando for CLIENT
// e exige que o servico de calibracao esteja contratado.
instrumentsRouter.post("/", requireRole(...CMMS_PLANNING_ROLES, "TECHNICIAN"), createInstrument);
instrumentsRouter.patch("/:id", requireRole(...CMMS_PLANNING_ROLES, "TECHNICIAN"), updateInstrument);
// O parque e' do cliente: quem cadastra tambem corrige e remove. A equipe da OptiProcess
// alcanca pelo acesso master; o escopo por empresa e' garantido no controller.
instrumentsRouter.get("/:id/impacto-da-remocao", requireRole(...CMMS_ADMIN_ROLES), getInstrumentRemovalImpact);
instrumentsRouter.delete("/:id", requireRole(...CMMS_ADMIN_ROLES), deleteInstrument);

// Anexos do ativo (manual, foto do equipamento etc.)
instrumentsRouter.get("/:id/attachments", listInstrumentAttachmentsRoute);
instrumentsRouter.get("/:id/attachments/:attachmentId/url", getInstrumentAttachmentUrl);
instrumentsRouter.post("/:id/photo", requireRole(...CMMS_PLANNING_ROLES, "TECHNICIAN"), uploadImage.single("file"), uploadInstrumentPhoto);
instrumentsRouter.delete("/:id/photo", requireRole(...CMMS_PLANNING_ROLES, "TECHNICIAN"), deleteInstrumentPhoto);
instrumentsRouter.post("/:id/attachments", requireRole(...CMMS_PLANNING_ROLES, "TECHNICIAN"), uploadAny.single("file"), uploadInstrumentAttachment);
instrumentsRouter.delete("/:id/attachments/:attachmentId", requireRole(...CMMS_PLANNING_ROLES, "TECHNICIAN"), deleteInstrumentAttachment);
