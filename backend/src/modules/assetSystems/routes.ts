import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { listAssetSystems, createAssetSystem, updateAssetSystem, deleteAssetSystem } from "./controller";

export const assetSystemsRouter = Router();

assetSystemsRouter.use(requireAuth);

assetSystemsRouter.get("/", listAssetSystems);
assetSystemsRouter.post("/", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), createAssetSystem);
assetSystemsRouter.patch("/:id", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), updateAssetSystem);
assetSystemsRouter.delete("/:id", requireRole("ADMIN"), deleteAssetSystem);
