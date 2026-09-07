import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  setUserPassword,
  listRoleDefinitions,
} from "./controller";

export const usersRouter = Router();

// O gestor da empresa administra os acessos da propria equipe. Tudo o que ele alcanca e'
// cercado no controller: so a propria empresa, so os perfis do portal, nunca o proprio
// acesso. A equipe da OptiProcess continua enxergando todos.
usersRouter.use(requireAuth, requireRole("ADMIN", "CLIENT"));

usersRouter.get("/roles", listRoleDefinitions);
usersRouter.get("/", listUsers);
usersRouter.get("/:id", getUser);
usersRouter.post("/", createUser);
usersRouter.patch("/:id", updateUser);
usersRouter.delete("/:id", deleteUser);
usersRouter.post("/:id/reset-password", resetPassword);
usersRouter.post("/:id/password", setUserPassword);
