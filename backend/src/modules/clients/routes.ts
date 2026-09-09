import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole, STAFF_ROLES } from "../../middleware/rbac";
import { uploadImage } from "../../middleware/upload";
import {
  listClients,
  getClient,
  getOwnClient,
  createClient,
  updateClient,
  deleteClient,
  uploadOwnClientLogo,
  deleteOwnClientLogo,
  addClientContact,
  updateClientContact,
  deleteClientContact,
} from "./controller";

export const clientsRouter = Router();

clientsRouter.use(requireAuth);

// Portal do cliente: acesso somente ao proprio registro (antes do gate de staff abaixo).
// O Solicitante fica de fora: contrato, plano e lista de acessos nao sao assunto de quem
// so abre solicitacao - e a resposta traz os usuarios da empresa inteira.
clientsRouter.get("/me", requireRole("ADMIN", "TECHNICIAN", "COMMERCIAL", "CLIENT", "CLIENT_PLANNER", "CLIENT_TECHNICIAN"), getOwnClient);
// Logo da empresa: so quem administra o proprio cliente (perfil "Administrador"), em
// Configuracao > Meu perfil - nao e' cadastro que a OptiProcess mexe pelo cliente.
clientsRouter.post("/me/logo", requireRole("CLIENT"), uploadImage.single("file"), uploadOwnClientLogo);
clientsRouter.delete("/me/logo", requireRole("CLIENT"), deleteOwnClientLogo);

clientsRouter.use(requireRole(...STAFF_ROLES));

clientsRouter.get("/", listClients);
clientsRouter.get("/:id", getClient);
clientsRouter.post("/", requireRole("ADMIN", "COMMERCIAL"), createClient);
clientsRouter.patch("/:id", requireRole("ADMIN", "COMMERCIAL"), updateClient);
clientsRouter.delete("/:id", requireRole("ADMIN", "COMMERCIAL"), deleteClient);

clientsRouter.post("/:id/contacts", requireRole("ADMIN", "COMMERCIAL"), addClientContact);
clientsRouter.patch("/:id/contacts/:contactId", requireRole("ADMIN", "COMMERCIAL"), updateClientContact);
clientsRouter.delete("/:id/contacts/:contactId", requireRole("ADMIN", "COMMERCIAL"), deleteClientContact);
