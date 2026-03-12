import { db } from "@/server/db";
import {
  botPendingMessages,
  type BotPendingMessage,
} from "@/shared/schema";
import { eq, and, sql, lte } from "drizzle-orm";
import type { IStorage } from "./types";

type BotMessageMethods = Pick<IStorage,
  | "createPendingMessage" | "getPendingMessagesForBot" | "getPendingMessageCount"
  | "ackMessage" | "purgeExpiredMessages"
  | "deletePendingMessagesByRef"
>;

export const botMessageMethods: BotMessageMethods = {
  async createPendingMessage(botId: string, eventType: string, payload: Record<string, unknown>, expiresAt: Date): Promise<BotPendingMessage> {
    const [msg] = await db.insert(botPendingMessages).values({
      botId,
      eventType,
      payload,
      expiresAt,
    }).returning();
    return msg;
  },

  async getPendingMessagesForBot(botId: string): Promise<BotPendingMessage[]> {
    return db
      .select()
      .from(botPendingMessages)
      .where(and(
        eq(botPendingMessages.botId, botId),
        eq(botPendingMessages.status, "pending"),
        sql`${botPendingMessages.expiresAt} > NOW()`,
      ))
      .orderBy(botPendingMessages.stagedAt);
  },

  async getPendingMessageCount(botId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(botPendingMessages)
      .where(and(
        eq(botPendingMessages.botId, botId),
        eq(botPendingMessages.status, "pending"),
        sql`${botPendingMessages.expiresAt} > NOW()`,
      ));
    return Number(result[0]?.count || 0);
  },

  async ackMessage(id: number, botId: string): Promise<boolean> {
    const result = await db
      .delete(botPendingMessages)
      .where(and(
        eq(botPendingMessages.id, id),
        eq(botPendingMessages.botId, botId),
      ))
      .returning();
    return result.length > 0;
  },

  async purgeExpiredMessages(): Promise<number> {
    const result = await db
      .delete(botPendingMessages)
      .where(lte(botPendingMessages.expiresAt, new Date()))
      .returning();
    return result.length;
  },

  async deletePendingMessagesByRef(botId: string, eventType: string, refKey: string, refValue: string): Promise<number> {
    const result = await db
      .delete(botPendingMessages)
      .where(and(
        eq(botPendingMessages.botId, botId),
        eq(botPendingMessages.eventType, eventType),
        sql`${botPendingMessages.payload}->>>${refKey} = ${refValue}`,
      ))
      .returning();
    return result.length;
  },
};
