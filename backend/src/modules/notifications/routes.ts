import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { listNotifications, markNotificationRead, markAllNotificationsRead } from "./controller";

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get("/", listNotifications);
notificationsRouter.post("/:id/read", markNotificationRead);
notificationsRouter.post("/read-all", markAllNotificationsRead);
