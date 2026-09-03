import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { listPlans, getPlan, createPlan, updatePlan, deletePlan } from "./controller";

export const plansRouter = Router();

plansRouter.use(requireAuth);

// Catalogo de planos: consulta liberada pra quem gerencia clientes (pra atribuir na ficha),
// escrita restrita ao ADMIN (decisao comercial/plataforma).
plansRouter.get("/", requireRole("ADMIN", "COMMERCIAL"), listPlans);
plansRouter.get("/:id", requireRole("ADMIN", "COMMERCIAL"), getPlan);
plansRouter.post("/", requireRole("ADMIN"), createPlan);
plansRouter.patch("/:id", requireRole("ADMIN"), updatePlan);
plansRouter.delete("/:id", requireRole("ADMIN"), deletePlan);
