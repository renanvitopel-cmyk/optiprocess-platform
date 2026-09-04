import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole, CMMS_ROLES } from "../../middleware/rbac";
import { listLaborTypes, createLaborType, updateLaborType, deleteLaborType } from "./controller";

export const laborTypesRouter = Router();

laborTypesRouter.use(requireAuth, requireRole(...CMMS_ROLES));

laborTypesRouter.get("/", listLaborTypes);
laborTypesRouter.post("/", requireRole(...CMMS_ROLES), createLaborType);
laborTypesRouter.patch("/:id", requireRole(...CMMS_ROLES), updateLaborType);
laborTypesRouter.delete("/:id", requireRole(...CMMS_ROLES), deleteLaborType);
