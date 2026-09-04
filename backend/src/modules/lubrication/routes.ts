import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole, CMMS_ROLES } from "../../middleware/rbac";
import {
  listLubricants,
  createLubricant,
  updateLubricant,
  deleteLubricant,
  listLubricationPoints,
  getLubricationPoint,
  createLubricationPoint,
  updateLubricationPoint,
  deleteLubricationPoint,
  createLubricationRecord,
  listLubricationRecords,
  listLubricationRoutes,
  getLubricationRoute,
  createLubricationRoute,
  updateLubricationRoute,
  deleteLubricationRoute,
  getLubricationForecast,
  getLubricationDashboard,
} from "./controller";

export const lubricationRouter = Router();

// Lubrificacao e' parte do CMMS do cliente: quem contratou cadastra e executa a propria
// rotina, como no almoxarifado e nos ativos.
lubricationRouter.use(requireAuth, requireRole(...CMMS_ROLES));

// Rotas fixas antes das com :id, senao "previsao" seria lido como um id de ponto.
lubricationRouter.get("/dashboard", getLubricationDashboard);
lubricationRouter.get("/previsao", getLubricationForecast);
lubricationRouter.get("/registros", listLubricationRecords);

lubricationRouter.get("/lubrificantes", listLubricants);
lubricationRouter.post("/lubrificantes", createLubricant);
lubricationRouter.patch("/lubrificantes/:id", updateLubricant);
lubricationRouter.delete("/lubrificantes/:id", deleteLubricant);

lubricationRouter.get("/rotas", listLubricationRoutes);
lubricationRouter.get("/rotas/:id", getLubricationRoute);
lubricationRouter.post("/rotas", createLubricationRoute);
lubricationRouter.patch("/rotas/:id", updateLubricationRoute);
lubricationRouter.delete("/rotas/:id", deleteLubricationRoute);

lubricationRouter.get("/pontos", listLubricationPoints);
lubricationRouter.get("/pontos/:id", getLubricationPoint);
lubricationRouter.post("/pontos", createLubricationPoint);
lubricationRouter.patch("/pontos/:id", updateLubricationPoint);
lubricationRouter.delete("/pontos/:id", deleteLubricationPoint);
lubricationRouter.post("/pontos/:id/registros", createLubricationRecord);
