import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { listAssetTypes, createAssetType, updateAssetType, deleteAssetType } from "./controller";

export const assetTypesRouter = Router();

assetTypesRouter.use(requireAuth, requireRole("ADMIN", "TECHNICIAN", "COMMERCIAL", "CLIENT"));

assetTypesRouter.get("/", listAssetTypes);
assetTypesRouter.post("/", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), createAssetType);
assetTypesRouter.patch("/:id", requireRole("ADMIN", "TECHNICIAN", "CLIENT"), updateAssetType);
assetTypesRouter.delete("/:id", requireRole("ADMIN", "CLIENT"), deleteAssetType);
