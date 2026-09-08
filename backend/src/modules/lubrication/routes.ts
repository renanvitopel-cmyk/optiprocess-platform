import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole, CMMS_ROLES } from "../../middleware/rbac";
import {
  listLubricants,
  createLubricant,
  updateLubricant,
  deleteLubricant,
  listLubricationPoints,
  listPendingLubricationPoints,
  getNextLubricationPointCode,
  setLubricationPointsComplete,
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
  sugerirPontosDeLubrificacao,
  gerarOrdensDaRota,
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
lubricationRouter.post("/rotas/:id/ordens", gerarOrdensDaRota);
lubricationRouter.get("/rotas/:id", getLubricationRoute);
lubricationRouter.post("/rotas", createLubricationRoute);
lubricationRouter.patch("/rotas/:id", updateLubricationRoute);
lubricationRouter.delete("/rotas/:id", deleteLubricationRoute);

// Antes de "/pontos/:id", senao "pendentes" viraria um id.
lubricationRouter.get("/pontos/pendentes", listPendingLubricationPoints);
lubricationRouter.get("/pontos/proximo-codigo", getNextLubricationPointCode);
lubricationRouter.get("/pontos/sugestao-automatica", sugerirPontosDeLubrificacao);
// Concluir e' do ativo, nao do ponto: e' o ativo que sai (ou volta) para a fila.
lubricationRouter.patch("/ativos/:id/pontos-concluidos", setLubricationPointsComplete);
lubricationRouter.get("/pontos", listLubricationPoints);
lubricationRouter.get("/pontos/:id", getLubricationPoint);
lubricationRouter.post("/pontos", createLubricationPoint);
lubricationRouter.patch("/pontos/:id", updateLubricationPoint);
lubricationRouter.delete("/pontos/:id", deleteLubricationPoint);
lubricationRouter.post("/pontos/:id/registros", createLubricationRecord);
