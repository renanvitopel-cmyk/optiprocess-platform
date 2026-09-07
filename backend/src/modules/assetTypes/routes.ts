import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole, CMMS_PLANNING_ROLES, CMMS_ADMIN_ROLES } from "../../middleware/rbac";
import { listAssetTypes, createAssetType, updateAssetType, deleteAssetType } from "./controller";

export const assetTypesRouter = Router();

assetTypesRouter.use(requireAuth, requireRole("ADMIN", "TECHNICIAN", "COMMERCIAL", "CLIENT"));

assetTypesRouter.get("/", listAssetTypes);
assetTypesRouter.post("/", requireRole(...CMMS_PLANNING_ROLES, "TECHNICIAN"), createAssetType);
assetTypesRouter.patch("/:id", requireRole(...CMMS_PLANNING_ROLES, "TECHNICIAN"), updateAssetType);
assetTypesRouter.delete("/:id", requireRole(...CMMS_ADMIN_ROLES), deleteAssetType);
