import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { listStoppageReasons, createStoppageReason, updateStoppageReason, deleteStoppageReason } from "./controller";

export const stoppageReasonsRouter = Router();

stoppageReasonsRouter.use(requireAuth, requireRole("ADMIN", "TECHNICIAN", "COMMERCIAL", "CLIENT"));

stoppageReasonsRouter.get("/", listStoppageReasons);
stoppageReasonsRouter.post("/", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), createStoppageReason);
stoppageReasonsRouter.patch("/:id", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), updateStoppageReason);
stoppageReasonsRouter.delete("/:id", requireRole("ADMIN", "CLIENT"), deleteStoppageReason);
