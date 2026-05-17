import { db } from "@/server/db";
import {
  rail3Cards, rail3Transactions,
  type Rail3Card, type InsertRail3Card,
  type Rail3Transaction, type InsertRail3Transaction,
} from "@/shared/schema";
import { eq, desc } from "drizzle-orm";
import type { IStorage } from "../types";

type Rail3Methods = Pick<IStorage,
  | "createRail3Card" | "getRail3CardByCardId" | "getRail3CardsByOwnerUid"
  | "getRail3CardByBotId" | "countRail3CardsByBotId" | "updateRail3Card" | "deleteRail3Card"
  | "getRail3CardByPaymentMethodId"
  | "createRail3Transaction" | "getRail3TransactionById" | "updateRail3Transaction" | "getRail3TransactionsByCardId"
>;

export const rail3Methods: Rail3Methods = {
  async createRail3Card(data: InsertRail3Card): Promise<Rail3Card> {
    const [card] = await db.insert(rail3Cards).values(data).returning();
    return card;
  },

  async getRail3CardByCardId(cardId: string): Promise<Rail3Card | null> {
    const [card] = await db.select().from(rail3Cards).where(eq(rail3Cards.cardId, cardId)).limit(1);
    return card || null;
  },

  async getRail3CardsByOwnerUid(ownerUid: string): Promise<Rail3Card[]> {
    return db.select().from(rail3Cards).where(eq(rail3Cards.ownerUid, ownerUid)).orderBy(desc(rail3Cards.createdAt));
  },

  async getRail3CardByBotId(botId: string): Promise<Rail3Card | null> {
    const [card] = await db.select().from(rail3Cards).where(eq(rail3Cards.botId, botId)).orderBy(desc(rail3Cards.createdAt)).limit(1);
    return card || null;
  },

  async countRail3CardsByBotId(botId: string): Promise<number> {
    const cards = await db.select().from(rail3Cards).where(eq(rail3Cards.botId, botId));
    return cards.length;
  },

  async updateRail3Card(cardId: string, data: Partial<InsertRail3Card>): Promise<Rail3Card | null> {
    const [updated] = await db
      .update(rail3Cards)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(rail3Cards.cardId, cardId))
      .returning();
    return updated || null;
  },

  async deleteRail3Card(cardId: string): Promise<void> {
    await db.delete(rail3Cards).where(eq(rail3Cards.cardId, cardId));
  },

  async getRail3CardByPaymentMethodId(paymentMethodId: string): Promise<Rail3Card | null> {
    const [card] = await db.select().from(rail3Cards).where(eq(rail3Cards.paymentMethodId, paymentMethodId)).limit(1);
    return card || null;
  },

  async createRail3Transaction(data: InsertRail3Transaction): Promise<Rail3Transaction> {
    const [tx] = await db.insert(rail3Transactions).values(data).returning();
    return tx;
  },

  async getRail3TransactionById(transactionId: string): Promise<Rail3Transaction | null> {
    const [tx] = await db.select().from(rail3Transactions).where(eq(rail3Transactions.transactionId, transactionId)).limit(1);
    return tx || null;
  },

  async updateRail3Transaction(transactionId: string, data: Partial<InsertRail3Transaction>): Promise<Rail3Transaction | null> {
    const [updated] = await db
      .update(rail3Transactions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(rail3Transactions.transactionId, transactionId))
      .returning();
    return updated || null;
  },

  async getRail3TransactionsByCardId(cardId: string, limit = 50): Promise<Rail3Transaction[]> {
    return db
      .select()
      .from(rail3Transactions)
      .where(eq(rail3Transactions.cardId, cardId))
      .orderBy(desc(rail3Transactions.createdAt))
      .limit(limit);
  },
};
