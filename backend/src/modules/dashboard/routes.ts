import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole, STAFF_ROLES } from "../../middleware/rbac";
import { getAdminDashboard, getClientDashboard } from "./controller";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get("/admin", requireRole(...STAFF_ROLES), getAdminDashboard);
dashboardRouter.get("/client", requireRole("CLIENT"), getClientDashboard);
