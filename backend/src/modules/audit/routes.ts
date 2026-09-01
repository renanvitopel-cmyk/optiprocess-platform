import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { listAuditLogs } from "./controller";

export const auditRouter = Router();

auditRouter.use(requireAuth, requireRole("ADMIN"));
auditRouter.get("/", listAuditLogs);
