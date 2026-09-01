import { api } from "./client";
import type { NotificationItem } from "./types";

export async function listNotifications(): Promise<{ items: NotificationItem[]; unreadCount: number }> {
  const { data } = await api.get<{ items: NotificationItem[]; unreadCount: number }>("/notifications");
  return data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.post(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post("/notifications/read-all");
}
