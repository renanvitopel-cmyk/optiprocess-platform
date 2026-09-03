import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
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
} from "./controller";

export const instrumentsRouter = Router();

instrumentsRouter.use(requireAuth);

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
instrumentsRouter.get("/:id/parts", listAssetParts);
instrumentsRouter.post("/:id/parts", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), addAssetPart);
instrumentsRouter.delete("/:id/parts/:linkId", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), removeAssetPart);
// Historico real de consumo (o que ja foi baixado do almoxarifado nas OS deste ativo).
instrumentsRouter.get("/:id/parts-history", getInstrumentPartsHistory);
