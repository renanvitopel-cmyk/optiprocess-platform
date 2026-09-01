import { Router } from "express";
import { attachUserIfPresent } from "../../middleware/auth";
import { publicFormRateLimit } from "../../middleware/rateLimit";
import { getPublicConfig, validateCertificate, getPublicCertificatePdfUrl, submitPublicQuote } from "./controller";

export const publicRouter = Router();

publicRouter.get("/config", getPublicConfig);
publicRouter.get("/certificates/:code", publicFormRateLimit, validateCertificate);
publicRouter.get("/certificates/:code/pdf", publicFormRateLimit, getPublicCertificatePdfUrl);
publicRouter.post("/quotes", publicFormRateLimit, attachUserIfPresent, submitPublicQuote);
