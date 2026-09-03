import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole, STAFF_ROLES } from "../../middleware/rbac";
import { getAdminDashboard, getClientDashboard, getPlatformDashboard } from "./controller";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get("/admin", requireRole(...STAFF_ROLES), getAdminDashboard);
dashboardRouter.get("/client", requireRole("CLIENT"), getClientDashboard);
dashboardRouter.get("/platform", requireRole("ADMIN"), getPlatformDashboard);
