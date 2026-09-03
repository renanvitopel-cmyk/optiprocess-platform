import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { listCostCenters, createCostCenter, updateCostCenter, deleteCostCenter } from "./controller";

export const costCentersRouter = Router();

costCentersRouter.use(requireAuth);

costCentersRouter.get("/", listCostCenters);
costCentersRouter.post("/", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), createCostCenter);
costCentersRouter.patch("/:id", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), updateCostCenter);
costCentersRouter.delete("/:id", requireRole("ADMIN"), deleteCostCenter);
