import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole, CMMS_PLANNING_ROLES } from "../../middleware/rbac";
import { listAreas, createArea, updateArea, deleteArea } from "./controller";

export const areasRouter = Router();

areasRouter.use(requireAuth);

areasRouter.get("/", listAreas);
areasRouter.post("/", requireRole(...CMMS_PLANNING_ROLES, "TECHNICIAN"), createArea);
areasRouter.patch("/:id", requireRole(...CMMS_PLANNING_ROLES, "TECHNICIAN"), updateArea);
areasRouter.delete("/:id", requireRole("ADMIN"), deleteArea);
