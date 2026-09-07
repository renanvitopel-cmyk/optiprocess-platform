import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole, CMMS_PLANNING_ROLES } from "../../middleware/rbac";
import { listCostCenters, createCostCenter, updateCostCenter, deleteCostCenter } from "./controller";

export const costCentersRouter = Router();

costCentersRouter.use(requireAuth);

costCentersRouter.get("/", listCostCenters);
costCentersRouter.post("/", requireRole(...CMMS_PLANNING_ROLES, "TECHNICIAN"), createCostCenter);
costCentersRouter.patch("/:id", requireRole(...CMMS_PLANNING_ROLES, "TECHNICIAN"), updateCostCenter);
costCentersRouter.delete("/:id", requireRole("ADMIN"), deleteCostCenter);
