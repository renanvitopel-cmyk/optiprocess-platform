import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { listAreas, createArea, updateArea, deleteArea } from "./controller";

export const areasRouter = Router();

areasRouter.use(requireAuth);

areasRouter.get("/", listAreas);
areasRouter.post("/", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), createArea);
areasRouter.patch("/:id", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), updateArea);
areasRouter.delete("/:id", requireRole("ADMIN"), deleteArea);
