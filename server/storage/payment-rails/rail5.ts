import { db } from "@/server/db";
import {
  rail5Cards, rail5Transactions,
  type Rail5Card, type InsertRail5Card,
  type Rail5Transaction, type InsertRail5Transaction,
} from "@/shared/schema";
import { eq, desc } from "drizzle-orm";
import type { IStorage } from "../types";

type Rail5Methods = Pick<IStorage,
  | "createRail5Card" | "getRail5CardByCardId" | "getRail5CardsByOwnerUid"
  | "getRail5CardByBotId" | "countRail5CardsByBotId" | "updateRail5Card" | "deleteRail5Card"
  | "getRail5CardByTestToken"
  | "createRail5Transaction" | "getRail5TransactionById" | "updateRail5Transaction" | "getRail5TransactionsByCardId"
>;

export const rail5Methods: Rail5Methods = {
  async createRail5Card(data: InsertRail5Card): Promise<Rail5Card> {
    const [card] = await db.insert(rail5Cards).values(data).returning();
    return card;
  },

  async getRail5CardByCardId(cardId: string): Promise<Rail5Card | null> {
    const [card] = await db.select().from(rail5Cards).where(eq(rail5Cards.cardId, cardId)).limit(1);
    return card || null;
  },

  async getRail5CardsByOwnerUid(ownerUid: string): Promise<Rail5Card[]> {
    return db.select().from(rail5Cards).where(eq(rail5Cards.ownerUid, ownerUid)).orderBy(desc(rail5Cards.createdAt));
  },

  async getRail5CardByBotId(botId: string): Promise<Rail5Card | null> {
    const [card] = await db.select().from(rail5Cards).where(eq(rail5Cards.botId, botId)).orderBy(desc(rail5Cards.createdAt)).limit(1);
    return card || null;
  },

  async countRail5CardsByBotId(botId: string): Promise<number> {
    const cards = await db.select().from(rail5Cards).where(eq(rail5Cards.botId, botId));
    return cards.length;
  },

  async updateRail5Card(cardId: string, data: Partial<InsertRail5Card>): Promise<Rail5Card | null> {
    const [updated] = await db
      .update(rail5Cards)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(rail5Cards.cardId, cardId))
      .returning();
    return updated || null;
  },

  async deleteRail5Card(cardId: string): Promise<void> {
    await db.delete(rail5Cards).where(eq(rail5Cards.cardId, cardId));
  },

  async getRail5CardByTestToken(token: string): Promise<Rail5Card | null> {
    const [card] = await db.select().from(rail5Cards).where(eq(rail5Cards.testToken, token)).limit(1);
    return card || null;
  },

  async createRail5Transaction(data: InsertRail5Transaction): Promise<Rail5Transaction> {
    const [tx] = await db.insert(rail5Transactions).values(data).returning();
    return tx;
  },

  async getRail5TransactionById(checkoutId: string): Promise<Rail5Transaction | null> {
    const [tx] = await db.select().from(rail5Transactions).where(eq(rail5Transactions.checkoutId, checkoutId)).limit(1);
    return tx || null;
  },

  async updateRail5Transaction(checkoutId: string, data: Partial<InsertRail5Transaction>): Promise<Rail5Transaction | null> {
    const [updated] = await db
      .update(rail5Transactions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(rail5Transactions.checkoutId, checkoutId))
      .returning();
    return updated || null;
  },

  async getRail5TransactionsByCardId(cardId: string, limit = 50): Promise<Rail5Transaction[]> {
    return db
      .select()
      .from(rail5Transactions)
      .where(eq(rail5Transactions.cardId, cardId))
      .orderBy(desc(rail5Transactions.createdAt))
      .limit(limit);
  },
};
