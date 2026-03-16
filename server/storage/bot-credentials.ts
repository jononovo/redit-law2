import { db } from "@/server/db";
import {
  botCredentials,
  type BotCredential,
  type InsertBotCredential,
} from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import type { IStorage } from "./types";

type BotCredentialMethods = Pick<IStorage,
  | "createBotCredential" | "getBotCredentialsByBotId"
  | "getBotCredentialByDomain" | "getBotCredentialById"
  | "updateBotCredential" | "deleteBotCredential"
>;

export const botCredentialMethods: BotCredentialMethods = {
  async createBotCredential(data: InsertBotCredential): Promise<BotCredential> {
    const [credential] = await db.insert(botCredentials).values(data).returning();
    return credential;
  },

  async getBotCredentialsByBotId(botId: string): Promise<BotCredential[]> {
    return db.select().from(botCredentials).where(eq(botCredentials.botId, botId));
  },

  async getBotCredentialByDomain(botId: string, domain: string): Promise<BotCredential | null> {
    const [credential] = await db.select().from(botCredentials)
      .where(and(eq(botCredentials.botId, botId), eq(botCredentials.merchantDomain, domain)))
      .limit(1);
    return credential || null;
  },

  async getBotCredentialById(credentialId: string): Promise<BotCredential | null> {
    const [credential] = await db.select().from(botCredentials)
      .where(eq(botCredentials.credentialId, credentialId))
      .limit(1);
    return credential || null;
  },

  async updateBotCredential(credentialId: string, updates: Partial<InsertBotCredential>): Promise<BotCredential | null> {
    const [credential] = await db.update(botCredentials)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(botCredentials.credentialId, credentialId))
      .returning();
    return credential || null;
  },

  async deleteBotCredential(credentialId: string): Promise<void> {
    await db.delete(botCredentials).where(eq(botCredentials.credentialId, credentialId));
  },
};
