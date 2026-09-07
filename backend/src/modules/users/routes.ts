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
  listUserAuditTrail,
} from "./controller";

export const usersRouter = Router();

// O gestor da empresa administra os acessos da propria equipe. Tudo o que ele alcanca e'
// cercado no controller: so a propria empresa, so os perfis do portal, nunca o proprio
// acesso. A equipe da OptiProcess continua enxergando todos.
// Quem administra acessos: a equipe da OptiProcess e, do lado do cliente, todos menos o
// Solicitante - que nao administra ninguem. Quem pode mexer em QUEM e' cercado no
// controller, contra src/lib/perfis.ts.
usersRouter.use(requireAuth, requireRole("ADMIN", "CLIENT", "CLIENT_PLANNER", "CLIENT_TECHNICIAN"));

usersRouter.get("/roles", listRoleDefinitions);
// Antes de "/:id", senao "historico" seria lido como um id de usuario.
usersRouter.get("/historico", listUserAuditTrail);
usersRouter.get("/", listUsers);
usersRouter.get("/:id", getUser);
usersRouter.post("/", createUser);
usersRouter.patch("/:id", updateUser);
usersRouter.delete("/:id", deleteUser);
usersRouter.post("/:id/reset-password", resetPassword);
usersRouter.post("/:id/password", setUserPassword);
