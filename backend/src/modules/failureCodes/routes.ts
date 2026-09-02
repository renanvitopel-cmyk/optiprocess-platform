import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { listFailureCodes, createFailureCode, updateFailureCode, deleteFailureCode } from "./controller";

export const failureCodesRouter = Router();

failureCodesRouter.use(requireAuth, requireRole("ADMIN", "TECHNICIAN", "COMMERCIAL", "CLIENT"));

failureCodesRouter.get("/", listFailureCodes);
failureCodesRouter.post("/", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), createFailureCode);
failureCodesRouter.patch("/:id", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), updateFailureCode);
failureCodesRouter.delete("/:id", requireRole("ADMIN", "CLIENT"), deleteFailureCode);
