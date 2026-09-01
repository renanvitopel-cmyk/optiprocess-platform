import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { listContracts, getContract, createContract, updateContract, deleteContract } from "./controller";

export const contractsRouter = Router();

contractsRouter.use(requireAuth);

contractsRouter.get("/", listContracts);
contractsRouter.get("/:id", getContract);
contractsRouter.post("/", requireRole("ADMIN", "COMMERCIAL"), createContract);
contractsRouter.patch("/:id", requireRole("ADMIN", "COMMERCIAL"), updateContract);
contractsRouter.delete("/:id", requireRole("ADMIN"), deleteContract);
