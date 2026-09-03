import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { listLaborTypes, createLaborType, updateLaborType, deleteLaborType } from "./controller";

export const laborTypesRouter = Router();

laborTypesRouter.use(requireAuth, requireRole("ADMIN", "TECHNICIAN", "COMMERCIAL", "CLIENT"));

laborTypesRouter.get("/", listLaborTypes);
laborTypesRouter.post("/", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), createLaborType);
laborTypesRouter.patch("/:id", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), updateLaborType);
laborTypesRouter.delete("/:id", requireRole("ADMIN", "CLIENT"), deleteLaborType);
