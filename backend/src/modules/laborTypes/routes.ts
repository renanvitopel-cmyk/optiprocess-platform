import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole, CMMS_PLANNING_ROLES } from "../../middleware/rbac";
import { listLaborTypes, createLaborType, updateLaborType, deleteLaborType } from "./controller";

export const laborTypesRouter = Router();

laborTypesRouter.use(requireAuth, requireRole(...CMMS_PLANNING_ROLES));

laborTypesRouter.get("/", listLaborTypes);
laborTypesRouter.post("/", requireRole(...CMMS_PLANNING_ROLES), createLaborType);
laborTypesRouter.patch("/:id", requireRole(...CMMS_PLANNING_ROLES), updateLaborType);
laborTypesRouter.delete("/:id", requireRole(...CMMS_PLANNING_ROLES), deleteLaborType);
