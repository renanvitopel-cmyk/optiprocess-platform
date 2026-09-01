import { Router } from "express";
import { login, logout, me } from "./controller";
import { requireAuth } from "../../middleware/auth";
import { loginRateLimit } from "../../middleware/rateLimit";

export const authRouter = Router();

authRouter.post("/login", loginRateLimit, login);
authRouter.post("/logout", logout);
authRouter.get("/me", requireAuth, me);
