import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { listInstruments, getInstrument, createInstrument, updateInstrument, deleteInstrument } from "./controller";

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
