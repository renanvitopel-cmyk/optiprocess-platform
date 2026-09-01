import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { listQuotes, getQuote, updateQuote, approveQuote, rejectQuote } from "./controller";

export const quotesRouter = Router();

quotesRouter.use(requireAuth);

quotesRouter.get("/", listQuotes);
quotesRouter.get("/:id", getQuote);
quotesRouter.patch("/:id", requireRole("ADMIN", "COMMERCIAL"), updateQuote);
quotesRouter.post("/:id/approve", requireRole("ADMIN", "COMMERCIAL"), approveQuote);
quotesRouter.post("/:id/reject", requireRole("ADMIN", "COMMERCIAL"), rejectQuote);
