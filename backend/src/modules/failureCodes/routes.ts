import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { listFailureCodes, createFailureCode, updateFailureCode } from "./controller";

export const failureCodesRouter = Router();

failureCodesRouter.use(requireAuth, requireRole("ADMIN", "TECHNICIAN", "COMMERCIAL"));

failureCodesRouter.get("/", listFailureCodes);
failureCodesRouter.post("/", requireRole("ADMIN", "TECHNICIAN"), createFailureCode);
failureCodesRouter.patch("/:id", requireRole("ADMIN", "TECHNICIAN"), updateFailureCode);
