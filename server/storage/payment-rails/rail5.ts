import { db } from "@/server/db";
import {
  rail5Cards, rail5Checkouts,
  type Rail5Card, type InsertRail5Card,
  type Rail5Checkout, type InsertRail5Checkout,
} from "@/shared/schema";
import { eq, desc } from "drizzle-orm";
import type { IStorage } from "../types";

type Rail5Methods = Pick<IStorage,
  | "createRail5Card" | "getRail5CardByCardId" | "getRail5CardsByOwnerUid"
  | "getRail5CardByBotId" | "countRail5CardsByBotId" | "updateRail5Card" | "deleteRail5Card"
  | "getRail5CardByTestToken"
  | "createRail5Checkout" | "getRail5CheckoutById" | "updateRail5Checkout" | "getRail5CheckoutsByCardId"
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

  async createRail5Checkout(data: InsertRail5Checkout): Promise<Rail5Checkout> {
    const [checkout] = await db.insert(rail5Checkouts).values(data).returning();
    return checkout;
  },

  async getRail5CheckoutById(checkoutId: string): Promise<Rail5Checkout | null> {
    const [checkout] = await db.select().from(rail5Checkouts).where(eq(rail5Checkouts.checkoutId, checkoutId)).limit(1);
    return checkout || null;
  },

  async updateRail5Checkout(checkoutId: string, data: Partial<InsertRail5Checkout>): Promise<Rail5Checkout | null> {
    const [updated] = await db
      .update(rail5Checkouts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(rail5Checkouts.checkoutId, checkoutId))
      .returning();
    return updated || null;
  },

  async getRail5CheckoutsByCardId(cardId: string, limit = 50): Promise<Rail5Checkout[]> {
    return db
      .select()
      .from(rail5Checkouts)
      .where(eq(rail5Checkouts.cardId, cardId))
      .orderBy(desc(rail5Checkouts.createdAt))
      .limit(limit);
  },
};
