import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { listMeters, getMeter, createMeter, updateMeter, deleteMeter, addMeterReading } from "./controller";

export const metersRouter = Router();

metersRouter.use(requireAuth);

metersRouter.get("/", listMeters);
metersRouter.get("/:id", getMeter);
metersRouter.post("/", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), createMeter);
metersRouter.patch("/:id", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), updateMeter);
metersRouter.delete("/:id", requireRole("ADMIN"), deleteMeter);
metersRouter.post("/:id/readings", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), addMeterReading);
