import { db } from "@/server/db";
import {
  webhookDeliveries,
  type WebhookDelivery, type InsertWebhookDelivery,
} from "@/shared/schema";
import { eq, and, desc, sql, gte, lte, inArray } from "drizzle-orm";
import type { IStorage } from "./types";

type WebhookMethods = Pick<IStorage,
  | "createWebhookDelivery" | "updateWebhookDelivery" | "getPendingWebhookRetries"
  | "getPendingWebhookRetriesForBot" | "getWebhookDeliveriesByBotIds" | "getFailedWebhookCount24h"
>;

export const webhookMethods: WebhookMethods = {
  async createWebhookDelivery(data: InsertWebhookDelivery): Promise<WebhookDelivery> {
    const [delivery] = await db.insert(webhookDeliveries).values(data).returning();
    return delivery;
  },

  async updateWebhookDelivery(id: number, data: Partial<InsertWebhookDelivery>): Promise<WebhookDelivery | null> {
    const [updated] = await db
      .update(webhookDeliveries)
      .set(data)
      .where(eq(webhookDeliveries.id, id))
      .returning();
    return updated || null;
  },

  async getPendingWebhookRetries(now: Date, limit = 10): Promise<WebhookDelivery[]> {
    return db
      .select()
      .from(webhookDeliveries)
      .where(and(
        eq(webhookDeliveries.status, "pending"),
        lte(webhookDeliveries.nextRetryAt, now),
      ))
      .orderBy(webhookDeliveries.nextRetryAt)
      .limit(limit);
  },

  async getPendingWebhookRetriesForBot(botId: string, now: Date, limit = 5): Promise<WebhookDelivery[]> {
    return db
      .select()
      .from(webhookDeliveries)
      .where(and(
        eq(webhookDeliveries.botId, botId),
        eq(webhookDeliveries.status, "pending"),
        lte(webhookDeliveries.nextRetryAt, now),
      ))
      .orderBy(webhookDeliveries.nextRetryAt)
      .limit(limit);
  },

  async getWebhookDeliveriesByBotIds(botIds: string[], limit = 50): Promise<WebhookDelivery[]> {
    if (botIds.length === 0) return [];
    return db
      .select()
      .from(webhookDeliveries)
      .where(sql`${webhookDeliveries.botId} IN (${sql.join(botIds.map(id => sql`${id}`), sql`, `)})`)
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(limit);
  },

  async getFailedWebhookCount24h(botIds: string[]): Promise<number> {
    if (botIds.length === 0) return 0;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(webhookDeliveries)
      .where(and(
        inArray(webhookDeliveries.botId, botIds),
        eq(webhookDeliveries.status, "failed"),
        gte(webhookDeliveries.createdAt, oneDayAgo),
      ));
    return Number(result[0]?.count || 0);
  },
};
