import { db } from "@/server/db";
import {
  rail5Cards, rail5Checkouts, rail5Wallets, rail5Transactions, bots,
  type Rail5Card, type InsertRail5Card,
  type Rail5Checkout, type InsertRail5Checkout,
  type Rail5Wallet, type InsertRail5Wallet,
  type Rail5Transaction, type InsertRail5Transaction,
} from "@/shared/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import type { IStorage } from "../types";

type Rail5Methods = Pick<IStorage,
  | "createRail5Card" | "getRail5CardByCardId" | "getRail5CardsByOwnerUid"
  | "getRail5CardByBotId" | "countRail5CardsByBotId" | "updateRail5Card" | "deleteRail5Card"
  | "getRail5CardByTestToken"
  | "createRail5Checkout" | "getRail5CheckoutById" | "updateRail5Checkout" | "getRail5CheckoutsByCardId"
  | "rail5CreateWallet" | "rail5GetWalletByBotId" | "rail5GetWalletByOwnerUid"
  | "rail5CreateTransaction" | "rail5GetTransactionsByWalletId"
  | "rail5DebitWallet" | "rail5GetMonthlySpend"
  | "rail5FreezeWallet" | "rail5UnfreezeWallet" | "rail5GetWalletsWithBotsByOwnerUid"
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

  async rail5CreateWallet(data: InsertRail5Wallet): Promise<Rail5Wallet> {
    const [wallet] = await db.insert(rail5Wallets).values(data).returning();
    return wallet;
  },

  async rail5GetWalletByBotId(botId: string): Promise<Rail5Wallet | null> {
    const [wallet] = await db.select().from(rail5Wallets).where(eq(rail5Wallets.botId, botId)).limit(1);
    return wallet || null;
  },

  async rail5GetWalletByOwnerUid(ownerUid: string): Promise<Rail5Wallet | null> {
    const [wallet] = await db.select().from(rail5Wallets).where(eq(rail5Wallets.ownerUid, ownerUid)).limit(1);
    return wallet || null;
  },

  async rail5CreateTransaction(data: InsertRail5Transaction): Promise<Rail5Transaction> {
    const [tx] = await db.insert(rail5Transactions).values(data).returning();
    return tx;
  },

  async rail5GetTransactionsByWalletId(walletId: number, limit = 50): Promise<Rail5Transaction[]> {
    return db
      .select()
      .from(rail5Transactions)
      .where(eq(rail5Transactions.walletId, walletId))
      .orderBy(desc(rail5Transactions.createdAt))
      .limit(limit);
  },

  async rail5DebitWallet(walletId: number, amountCents: number): Promise<Rail5Wallet | null> {
    const [updated] = await db
      .update(rail5Wallets)
      .set({
        balanceCents: sql`${rail5Wallets.balanceCents} - ${amountCents}`,
        updatedAt: new Date(),
      })
      .where(and(eq(rail5Wallets.id, walletId), gte(rail5Wallets.balanceCents, amountCents)))
      .returning();
    return updated || null;
  },

  async rail5GetMonthlySpend(walletId: number): Promise<number> {
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);
    const result = await db
      .select({ total: sql<number>`COALESCE(SUM(${rail5Transactions.amountCents}), 0)` })
      .from(rail5Transactions)
      .where(and(
        eq(rail5Transactions.walletId, walletId),
        eq(rail5Transactions.type, "purchase"),
        gte(rail5Transactions.createdAt, firstOfMonth)
      ));
    return Number(result[0]?.total || 0);
  },

  async rail5FreezeWallet(walletId: number, ownerUid: string): Promise<Rail5Wallet | null> {
    const [updated] = await db
      .update(rail5Wallets)
      .set({ isFrozen: true, updatedAt: new Date() })
      .where(and(eq(rail5Wallets.id, walletId), eq(rail5Wallets.ownerUid, ownerUid)))
      .returning();
    return updated || null;
  },

  async rail5UnfreezeWallet(walletId: number, ownerUid: string): Promise<Rail5Wallet | null> {
    const [updated] = await db
      .update(rail5Wallets)
      .set({ isFrozen: false, updatedAt: new Date() })
      .where(and(eq(rail5Wallets.id, walletId), eq(rail5Wallets.ownerUid, ownerUid)))
      .returning();
    return updated || null;
  },

  async rail5GetWalletsWithBotsByOwnerUid(ownerUid: string): Promise<(Rail5Wallet & { botName: string; botId: string })[]> {
    const results = await db
      .select({
        id: rail5Wallets.id,
        botId: rail5Wallets.botId,
        ownerUid: rail5Wallets.ownerUid,
        balanceCents: rail5Wallets.balanceCents,
        currency: rail5Wallets.currency,
        isFrozen: rail5Wallets.isFrozen,
        createdAt: rail5Wallets.createdAt,
        updatedAt: rail5Wallets.updatedAt,
        botName: bots.botName,
      })
      .from(rail5Wallets)
      .innerJoin(bots, eq(rail5Wallets.botId, bots.botId))
      .where(eq(rail5Wallets.ownerUid, ownerUid))
      .orderBy(desc(rail5Wallets.createdAt));
    return results;
  },
};
