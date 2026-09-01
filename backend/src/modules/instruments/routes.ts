import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { listInstruments, getInstrument, createInstrument, updateInstrument, deleteInstrument } from "./controller";

export const instrumentsRouter = Router();

instrumentsRouter.use(requireAuth);

instrumentsRouter.get("/", listInstruments);
instrumentsRouter.get("/:id", getInstrument);
instrumentsRouter.post("/", requireRole("ADMIN", "TECHNICIAN"), createInstrument);
instrumentsRouter.patch("/:id", requireRole("ADMIN", "TECHNICIAN"), updateInstrument);
instrumentsRouter.delete("/:id", requireRole("ADMIN"), deleteInstrument);
