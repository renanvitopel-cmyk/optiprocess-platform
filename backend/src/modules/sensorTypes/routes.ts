import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole, STAFF_ROLES } from "../../middleware/rbac";
import { listSensorTypes, createSensorType, updateSensorType, deleteSensorType } from "./controller";

export const sensorTypesRouter = Router();

sensorTypesRouter.use(requireAuth);

// Leitura aberta a qualquer usuario autenticado - o cliente tambem escolhe o tipo de
// sensor ao cadastrar um ponto de calibracao.
sensorTypesRouter.get("/", listSensorTypes);

// Manutencao do catalogo e' so' da equipe interna da OptiProcess.
sensorTypesRouter.post("/", requireRole(...STAFF_ROLES), createSensorType);
sensorTypesRouter.patch("/:id", requireRole(...STAFF_ROLES), updateSensorType);
sensorTypesRouter.delete("/:id", requireRole(...STAFF_ROLES), deleteSensorType);
