import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import {
  listServiceRequestCategories,
  createServiceRequestCategory,
  updateServiceRequestCategory,
  deleteServiceRequestCategory,
} from "./controller";

export const serviceRequestCategoriesRouter = Router();

serviceRequestCategoriesRouter.use(requireAuth, requireRole("ADMIN", "TECHNICIAN", "COMMERCIAL", "CLIENT"));

serviceRequestCategoriesRouter.get("/", listServiceRequestCategories);
serviceRequestCategoriesRouter.post("/", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), createServiceRequestCategory);
serviceRequestCategoriesRouter.patch("/:id", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), updateServiceRequestCategory);
serviceRequestCategoriesRouter.delete("/:id", requireRole("ADMIN", "CLIENT"), deleteServiceRequestCategory);
