import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole, CMMS_PLANNING_ROLES } from "../../middleware/rbac";
import { listPlants, createPlant, updatePlant, deletePlant } from "./controller";

export const plantsRouter = Router();

plantsRouter.use(requireAuth);

plantsRouter.get("/", listPlants);
plantsRouter.post("/", requireRole(...CMMS_PLANNING_ROLES, "TECHNICIAN"), createPlant);
plantsRouter.patch("/:id", requireRole(...CMMS_PLANNING_ROLES, "TECHNICIAN"), updatePlant);
plantsRouter.delete("/:id", requireRole("ADMIN"), deletePlant);
