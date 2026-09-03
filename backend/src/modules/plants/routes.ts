import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { listPlants, createPlant, updatePlant, deletePlant } from "./controller";

export const plantsRouter = Router();

plantsRouter.use(requireAuth);

plantsRouter.get("/", listPlants);
plantsRouter.post("/", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), createPlant);
plantsRouter.patch("/:id", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), updatePlant);
plantsRouter.delete("/:id", requireRole("ADMIN"), deletePlant);
