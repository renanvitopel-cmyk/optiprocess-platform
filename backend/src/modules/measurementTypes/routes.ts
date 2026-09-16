import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole, STAFF_ROLES } from "../../middleware/rbac";
import { listMeasurementTypes, createMeasurementType, updateMeasurementType, deleteMeasurementType } from "./controller";

export const measurementTypesRouter = Router();

measurementTypesRouter.use(requireAuth);

// Leitura aberta a qualquer usuario autenticado - o cliente tambem cadastra pontos de
// calibracao (ver /instruments/:id/calibration-points) e precisa escolher a grandeza.
measurementTypesRouter.get("/", listMeasurementTypes);

// Manutencao do catalogo (o que existe, quais campos cada grandeza pede) e' so' da
// equipe interna da OptiProcess - o cliente nunca cria/edita/remove um tipo.
measurementTypesRouter.post("/", requireRole(...STAFF_ROLES), createMeasurementType);
measurementTypesRouter.patch("/:id", requireRole(...STAFF_ROLES), updateMeasurementType);
measurementTypesRouter.delete("/:id", requireRole(...STAFF_ROLES), deleteMeasurementType);
