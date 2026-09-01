import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { listOrders, getOrder, updateOrder, changeOrderStatus } from "./controller";

export const ordersRouter = Router();

ordersRouter.use(requireAuth);

ordersRouter.get("/", listOrders);
ordersRouter.get("/:id", getOrder);
ordersRouter.patch("/:id", requireRole("ADMIN", "COMMERCIAL"), updateOrder);
ordersRouter.post("/:id/status", requireRole("ADMIN", "COMMERCIAL"), changeOrderStatus);
