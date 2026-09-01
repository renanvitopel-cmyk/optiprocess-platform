import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { UnauthorizedError, NotFoundError } from "../../utils/errors";

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: req.user.sub },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.notification.count({ where: { userId: req.user.sub, read: false } }),
  ]);

  res.json({ items, unreadCount });
});

export const markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();

  const notification = await prisma.notification.findFirst({ where: { id: req.params.id, userId: req.user.sub } });
  if (!notification) throw new NotFoundError("Notificacao");

  const updated = await prisma.notification.update({ where: { id: notification.id }, data: { read: true } });
  res.json(updated);
});

export const markAllNotificationsRead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  await prisma.notification.updateMany({ where: { userId: req.user.sub, read: false }, data: { read: true } });
  res.status(204).send();
});
