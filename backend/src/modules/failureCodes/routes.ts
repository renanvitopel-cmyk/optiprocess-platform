import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole, CMMS_ROLES } from "../../middleware/rbac";
import { listFailureCodes, createFailureCode, updateFailureCode, deleteFailureCode } from "./controller";

export const failureCodesRouter = Router();

failureCodesRouter.use(requireAuth, requireRole(...CMMS_ROLES));

failureCodesRouter.get("/", listFailureCodes);
failureCodesRouter.post("/", requireRole(...CMMS_ROLES), createFailureCode);
failureCodesRouter.patch("/:id", requireRole(...CMMS_ROLES), updateFailureCode);
failureCodesRouter.delete("/:id", requireRole(...CMMS_ROLES), deleteFailureCode);
