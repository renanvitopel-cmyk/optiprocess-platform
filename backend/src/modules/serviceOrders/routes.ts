import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import {
  listServiceOrders,
  getServiceOrder,
  createServiceOrder,
  updateServiceOrder,
  deleteServiceOrder,
  approveServiceOrder,
  addServiceOrderItem,
  updateServiceOrderItem,
  deleteServiceOrderItem,
} from "./controller";

export const serviceOrdersRouter = Router();

serviceOrdersRouter.use(requireAuth);

serviceOrdersRouter.get("/", listServiceOrders);
serviceOrdersRouter.get("/:id", getServiceOrder);
serviceOrdersRouter.post("/", requireRole("ADMIN", "TECHNICIAN", "COMMERCIAL"), createServiceOrder);
serviceOrdersRouter.patch("/:id", requireRole("ADMIN", "TECHNICIAN", "COMMERCIAL"), updateServiceOrder);
serviceOrdersRouter.delete("/:id", requireRole("ADMIN"), deleteServiceOrder);
serviceOrdersRouter.post("/:id/approve", requireRole("ADMIN", "CLIENT"), approveServiceOrder);

serviceOrdersRouter.post("/:id/items", requireRole("ADMIN", "TECHNICIAN"), addServiceOrderItem);
serviceOrdersRouter.patch("/:id/items/:itemId", requireRole("ADMIN", "TECHNICIAN"), updateServiceOrderItem);
serviceOrdersRouter.delete("/:id/items/:itemId", requireRole("ADMIN", "TECHNICIAN"), deleteServiceOrderItem);
