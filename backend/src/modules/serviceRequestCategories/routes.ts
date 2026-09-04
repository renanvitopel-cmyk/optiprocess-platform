import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole, CMMS_ROLES } from "../../middleware/rbac";
import {
  listServiceRequestCategories,
  createServiceRequestCategory,
  updateServiceRequestCategory,
  deleteServiceRequestCategory,
} from "./controller";

export const serviceRequestCategoriesRouter = Router();

serviceRequestCategoriesRouter.use(requireAuth, requireRole(...CMMS_ROLES));

serviceRequestCategoriesRouter.get("/", listServiceRequestCategories);
serviceRequestCategoriesRouter.post("/", requireRole(...CMMS_ROLES), createServiceRequestCategory);
serviceRequestCategoriesRouter.patch("/:id", requireRole(...CMMS_ROLES), updateServiceRequestCategory);
serviceRequestCategoriesRouter.delete("/:id", requireRole(...CMMS_ROLES), deleteServiceRequestCategory);
