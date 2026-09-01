import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole, STAFF_ROLES } from "../../middleware/rbac";
import { globalSearch } from "./controller";

export const searchRouter = Router();

searchRouter.use(requireAuth, requireRole(...STAFF_ROLES));
searchRouter.get("/", globalSearch);
