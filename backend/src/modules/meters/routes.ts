import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole, CMMS_ROLES } from "../../middleware/rbac";
import { getPredictivePanel, listMeters, getMeter, createMeter, updateMeter, deleteMeter, addMeterReading } from "./controller";

export const metersRouter = Router();

metersRouter.use(requireAuth, requireRole(...CMMS_ROLES));

// Antes de "/:id" para "painel-preditivo" nao ser lido como um id de medidor.
metersRouter.get("/predictive-panel", getPredictivePanel);
metersRouter.get("/", listMeters);
metersRouter.get("/:id", getMeter);
metersRouter.post("/", requireRole(...CMMS_ROLES), createMeter);
metersRouter.patch("/:id", requireRole(...CMMS_ROLES), updateMeter);
metersRouter.delete("/:id", requireRole("ADMIN"), deleteMeter);
metersRouter.post("/:id/readings", requireRole(...CMMS_ROLES), addMeterReading);
