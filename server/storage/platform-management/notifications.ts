import { db } from "@/server/db";
import {
  notificationPreferences, notifications,
  type NotificationPreference, type InsertNotificationPreference,
  type Notification, type InsertNotification,
} from "@/shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import type { IStorage } from "./types";

type NotificationMethods = Pick<IStorage,
  | "getNotificationPreferences" | "upsertNotificationPreferences"
  | "createNotification" | "getNotifications" | "getUnreadCount"
  | "markNotificationsRead" | "markAllNotificationsRead"
>;

export const notificationMethods: NotificationMethods = {
  async getNotificationPreferences(ownerUid: string): Promise<NotificationPreference | null> {
    const [pref] = await db.select().from(notificationPreferences).where(eq(notificationPreferences.ownerUid, ownerUid)).limit(1);
    return pref || null;
  },

  async upsertNotificationPreferences(ownerUid: string, data: Partial<InsertNotificationPreference>): Promise<NotificationPreference> {
    const existing = await this.getNotificationPreferences(ownerUid);
    if (existing) {
      const [updated] = await db
        .update(notificationPreferences)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(notificationPreferences.ownerUid, ownerUid))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(notificationPreferences)
      .values({ ownerUid, ...data })
      .returning();
    return created;
  },

  async createNotification(data: InsertNotification): Promise<Notification> {
    const [notif] = await db.insert(notifications).values(data).returning();
    return notif;
  },

  async getNotifications(ownerUid: string, limit = 20, unreadOnly = false): Promise<Notification[]> {
    const conditions = [eq(notifications.ownerUid, ownerUid)];
    if (unreadOnly) {
      conditions.push(eq(notifications.isRead, false));
    }
    return db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  },

  async getUnreadCount(ownerUid: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.ownerUid, ownerUid), eq(notifications.isRead, false)));
    return Number(result[0]?.count || 0);
  },

  async markNotificationsRead(ids: number[], ownerUid: string): Promise<void> {
    if (ids.length === 0) return;
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.ownerUid, ownerUid),
        sql`${notifications.id} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`
      ));
  },

  async markAllNotificationsRead(ownerUid: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.ownerUid, ownerUid), eq(notifications.isRead, false)));
  },
};
