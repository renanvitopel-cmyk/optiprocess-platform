import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole, CMMS_ROLES } from "../../middleware/rbac";
import { uploadAny, uploadImage } from "../../middleware/upload";
import {
  listInstruments,
  getInstrument,
  createInstrument,
  updateInstrument,
  deleteInstrument,
  listAssetParts,
  addAssetPart,
  removeAssetPart,
  getInstrumentPartsHistory,
  getInstrumentCostSummary,
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
// limita a propria) porque ate o Solicitante precisa escolher o equipamento ao abrir uma
// solicitacao. Escrever, e ver custo, e' que nao.
instrumentsRouter.get("/", listInstruments);
instrumentsRouter.get("/:id", getInstrument);
// CLIENT tambem pode cadastrar/editar os proprios ativos (o TAG e cadastrado pelo cliente
// ou pela OptiProcess); o controller forca clientId para a propria empresa quando for CLIENT
// e exige que o servico de calibracao esteja contratado.
instrumentsRouter.post("/", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), createInstrument);
instrumentsRouter.patch("/:id", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), updateInstrument);
instrumentsRouter.delete("/:id", requireRole("ADMIN"), deleteInstrument);

// BOM (lista de materiais do ativo) - o cliente tambem vincula pecas do proprio
// almoxarifado aos proprios ativos, quem tem CMMS_MAINTENANCE contratado.
instrumentsRouter.get("/:id/parts", requireRole(...CMMS_ROLES), listAssetParts);
instrumentsRouter.post("/:id/parts", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), addAssetPart);
instrumentsRouter.delete("/:id/parts/:linkId", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), removeAssetPart);
// Historico real de consumo (o que ja foi baixado do almoxarifado nas OS deste ativo).
instrumentsRouter.get("/:id/parts-history", requireRole(...CMMS_ROLES), getInstrumentPartsHistory);
// Gastos totais do ativo (pecas + mao de obra somadas de todas as OS).
// Quanto o ativo ja custou e' informacao de gestao - o Solicitante nao entra aqui.
instrumentsRouter.get("/:id/cost-summary", requireRole(...CMMS_ROLES), getInstrumentCostSummary);

// Anexos do ativo (manual, foto do equipamento etc.) - mesmo padrao ja usado nas OS.
instrumentsRouter.get("/:id/attachments", listInstrumentAttachmentsRoute);
instrumentsRouter.get("/:id/attachments/:attachmentId/url", getInstrumentAttachmentUrl);
instrumentsRouter.post("/:id/photo", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), uploadImage.single("file"), uploadInstrumentPhoto);
instrumentsRouter.delete("/:id/photo", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), deleteInstrumentPhoto);
instrumentsRouter.post("/:id/attachments", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), uploadAny.single("file"), uploadInstrumentAttachment);
instrumentsRouter.delete("/:id/attachments/:attachmentId", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), deleteInstrumentAttachment);
