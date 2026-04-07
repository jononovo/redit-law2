import { db } from "@/server/db";
import {
  crossmintWallets, crossmintGuardrails, crossmintTransactions,
  type CrossmintWallet, type InsertCrossmintWallet,
  type CrossmintGuardrail, type InsertCrossmintGuardrail,
  type CrossmintTransaction, type InsertCrossmintTransaction,
} from "@/shared/schema";
import { eq, and, desc, sql, gte, inArray } from "drizzle-orm";
import type { IStorage } from "./types";

type Rail2Methods = Pick<IStorage,
  | "crossmintCreateWallet" | "crossmintGetWalletById" | "crossmintGetWalletByBotId"
  | "crossmintGetWalletsByOwnerUid" | "crossmintUpdateWalletBalance"
  | "crossmintUpdateWalletBalanceAndSync" | "crossmintUpdateWalletSyncedAt"
  | "crossmintUpdateWalletStatus" | "crossmintLinkBot" | "crossmintUnlinkBot"
  | "crossmintGetGuardrails" | "crossmintUpsertGuardrails"
  | "crossmintCreateTransaction" | "crossmintGetTransactionsByWalletId"
  | "crossmintGetTransactionById" | "crossmintGetTransactionByOrderId"
  | "crossmintUpdateTransaction" | "crossmintGetDailySpend" | "crossmintGetMonthlySpend"
>;

export const rail2Methods: Rail2Methods = {
  async crossmintCreateWallet(data: InsertCrossmintWallet): Promise<CrossmintWallet> {
    const [wallet] = await db.insert(crossmintWallets).values(data).returning();
    return wallet;
  },

  async crossmintGetWalletById(id: number): Promise<CrossmintWallet | null> {
    const [wallet] = await db.select().from(crossmintWallets).where(eq(crossmintWallets.id, id)).limit(1);
    return wallet || null;
  },

  async crossmintGetWalletByBotId(botId: string): Promise<CrossmintWallet | null> {
    const [wallet] = await db.select().from(crossmintWallets).where(eq(crossmintWallets.botId, botId)).limit(1);
    return wallet || null;
  },

  async crossmintGetWalletsByOwnerUid(ownerUid: string): Promise<CrossmintWallet[]> {
    return db.select().from(crossmintWallets).where(eq(crossmintWallets.ownerUid, ownerUid)).orderBy(desc(crossmintWallets.createdAt));
  },

  async crossmintUpdateWalletBalance(id: number, balanceUsdc: number): Promise<CrossmintWallet | null> {
    const [updated] = await db
      .update(crossmintWallets)
      .set({ balanceUsdc, updatedAt: new Date() })
      .where(eq(crossmintWallets.id, id))
      .returning();
    return updated || null;
  },

  async crossmintUpdateWalletBalanceAndSync(id: number, balanceUsdc: number): Promise<CrossmintWallet | null> {
    const [updated] = await db
      .update(crossmintWallets)
      .set({ balanceUsdc, lastSyncedAt: new Date(), updatedAt: new Date() })
      .where(eq(crossmintWallets.id, id))
      .returning();
    return updated || null;
  },

  async crossmintUpdateWalletSyncedAt(id: number): Promise<void> {
    await db
      .update(crossmintWallets)
      .set({ lastSyncedAt: new Date() })
      .where(eq(crossmintWallets.id, id));
  },

  async crossmintUpdateWalletStatus(id: number, status: string, ownerUid: string): Promise<CrossmintWallet | null> {
    const [updated] = await db
      .update(crossmintWallets)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(crossmintWallets.id, id), eq(crossmintWallets.ownerUid, ownerUid)))
      .returning();
    return updated || null;
  },

  async crossmintLinkBot(id: number, botId: string, ownerUid: string): Promise<CrossmintWallet | null> {
    const [updated] = await db
      .update(crossmintWallets)
      .set({ botId, updatedAt: new Date() })
      .where(and(eq(crossmintWallets.id, id), eq(crossmintWallets.ownerUid, ownerUid)))
      .returning();
    return updated || null;
  },

  async crossmintUnlinkBot(id: number, ownerUid: string): Promise<CrossmintWallet | null> {
    const [updated] = await db
      .update(crossmintWallets)
      .set({ botId: "", updatedAt: new Date() })
      .where(and(eq(crossmintWallets.id, id), eq(crossmintWallets.ownerUid, ownerUid)))
      .returning();
    return updated || null;
  },

  async crossmintGetGuardrails(walletId: number): Promise<CrossmintGuardrail | null> {
    const [g] = await db.select().from(crossmintGuardrails).where(eq(crossmintGuardrails.walletId, walletId)).limit(1);
    return g || null;
  },

  async crossmintUpsertGuardrails(walletId: number, data: Partial<InsertCrossmintGuardrail>): Promise<CrossmintGuardrail> {
    const existing = await this.crossmintGetGuardrails(walletId);
    if (existing) {
      const [updated] = await db
        .update(crossmintGuardrails)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(crossmintGuardrails.walletId, walletId))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(crossmintGuardrails)
      .values({ walletId, ...data })
      .returning();
    return created;
  },

  async crossmintCreateTransaction(data: InsertCrossmintTransaction): Promise<CrossmintTransaction> {
    const [tx] = await db.insert(crossmintTransactions).values(data).returning();
    return tx;
  },

  async crossmintGetTransactionsByWalletId(walletId: number, limit = 50): Promise<CrossmintTransaction[]> {
    return db
      .select()
      .from(crossmintTransactions)
      .where(eq(crossmintTransactions.walletId, walletId))
      .orderBy(desc(crossmintTransactions.createdAt))
      .limit(limit);
  },

  async crossmintGetTransactionById(id: number): Promise<CrossmintTransaction | null> {
    const [tx] = await db.select().from(crossmintTransactions).where(eq(crossmintTransactions.id, id)).limit(1);
    return tx || null;
  },

  async crossmintGetTransactionByOrderId(orderId: string): Promise<CrossmintTransaction | null> {
    const [tx] = await db.select().from(crossmintTransactions).where(eq(crossmintTransactions.crossmintOrderId, orderId)).limit(1);
    return tx || null;
  },

  async crossmintUpdateTransaction(id: number, data: Partial<InsertCrossmintTransaction>): Promise<CrossmintTransaction | null> {
    const [updated] = await db
      .update(crossmintTransactions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(crossmintTransactions.id, id))
      .returning();
    return updated || null;
  },

  async crossmintGetDailySpend(walletId: number): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const [result] = await db
      .select({ total: sql<number>`COALESCE(SUM(${crossmintTransactions.amountUsdc}), 0)` })
      .from(crossmintTransactions)
      .where(and(
        eq(crossmintTransactions.walletId, walletId),
        eq(crossmintTransactions.type, "purchase"),
        gte(crossmintTransactions.createdAt, startOfDay),
        sql`${crossmintTransactions.status} NOT IN ('failed')`
      ));
    return Number(result?.total || 0);
  },

  async crossmintGetMonthlySpend(walletId: number): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const [result] = await db
      .select({ total: sql<number>`COALESCE(SUM(${crossmintTransactions.amountUsdc}), 0)` })
      .from(crossmintTransactions)
      .where(and(
        eq(crossmintTransactions.walletId, walletId),
        eq(crossmintTransactions.type, "purchase"),
        gte(crossmintTransactions.createdAt, startOfMonth),
        sql`${crossmintTransactions.status} NOT IN ('failed')`
      ));
    return Number(result?.total || 0);
  },

};
