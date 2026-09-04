import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole, CMMS_ROLES } from "../../middleware/rbac";
import { listStoppageReasons, createStoppageReason, updateStoppageReason, deleteStoppageReason } from "./controller";

export const stoppageReasonsRouter = Router();

stoppageReasonsRouter.use(requireAuth, requireRole(...CMMS_ROLES));

stoppageReasonsRouter.get("/", listStoppageReasons);
stoppageReasonsRouter.post("/", requireRole(...CMMS_ROLES), createStoppageReason);
stoppageReasonsRouter.patch("/:id", requireRole(...CMMS_ROLES), updateStoppageReason);
stoppageReasonsRouter.delete("/:id", requireRole(...CMMS_ROLES), deleteStoppageReason);
