import { Router } from "express";
import { login, logout, me, changeOwnPassword } from "./controller";
import { requireAuth } from "../../middleware/auth";
import { loginRateLimit } from "../../middleware/rateLimit";

export const authRouter = Router();

authRouter.post("/login", loginRateLimit, login);
authRouter.post("/logout", logout);
authRouter.get("/me", requireAuth, me);
// Mesmo rate limit do login: a rota confere a senha atual, entao e alvo de forca bruta.
authRouter.post("/change-password", loginRateLimit, requireAuth, changeOwnPassword);
