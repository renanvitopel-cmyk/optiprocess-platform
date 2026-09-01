import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole, STAFF_ROLES } from "../../middleware/rbac";
import {
  listClients,
  getClient,
  getOwnClient,
  createClient,
  updateClient,
  deleteClient,
  addClientContact,
  updateClientContact,
  deleteClientContact,
} from "./controller";

export const clientsRouter = Router();

clientsRouter.use(requireAuth);

// Portal do cliente: acesso somente ao proprio registro (antes do gate de staff abaixo).
clientsRouter.get("/me", getOwnClient);

clientsRouter.use(requireRole(...STAFF_ROLES));

clientsRouter.get("/", listClients);
clientsRouter.get("/:id", getClient);
clientsRouter.post("/", requireRole("ADMIN", "COMMERCIAL"), createClient);
clientsRouter.patch("/:id", requireRole("ADMIN", "COMMERCIAL"), updateClient);
clientsRouter.delete("/:id", requireRole("ADMIN", "COMMERCIAL"), deleteClient);

clientsRouter.post("/:id/contacts", requireRole("ADMIN", "COMMERCIAL"), addClientContact);
clientsRouter.patch("/:id/contacts/:contactId", requireRole("ADMIN", "COMMERCIAL"), updateClientContact);
clientsRouter.delete("/:id/contacts/:contactId", requireRole("ADMIN", "COMMERCIAL"), deleteClientContact);
