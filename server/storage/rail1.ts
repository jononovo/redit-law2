import { db } from "@/server/db";
import {
  privyWallets, privyGuardrails, privyTransactions,
  type PrivyWallet, type InsertPrivyWallet,
  type PrivyGuardrail, type InsertPrivyGuardrail,
  type PrivyTransaction, type InsertPrivyTransaction,
} from "@/shared/schema";
import { eq, and, desc, sql, gte, inArray } from "drizzle-orm";
import type { IStorage } from "./types";

type Rail1Methods = Pick<IStorage,
  | "privyCreateWallet" | "privyGetWalletById" | "privyGetWalletByBotId"
  | "privyGetWalletsByOwnerUid" | "privyGetWalletByAddress"
  | "privyUpdateWalletBalance" | "privyUpdateWalletStatus"
  | "privyUnlinkBot" | "privyLinkBot"
  | "privyUpdateWalletBalanceAndSync" | "privyUpdateWalletSyncedAt"
  | "privyGetGuardrails" | "privyUpsertGuardrails"
  | "privyCreateTransaction" | "privyGetTransactionsByWalletId" | "privyUpdateTransactionStatus"
  | "privyGetDailySpend" | "privyGetMonthlySpend"
>;

export const rail1Methods: Rail1Methods = {
  async privyCreateWallet(data: InsertPrivyWallet): Promise<PrivyWallet> {
    const [wallet] = await db.insert(privyWallets).values(data).returning();
    return wallet;
  },

  async privyGetWalletById(id: number): Promise<PrivyWallet | null> {
    const [wallet] = await db.select().from(privyWallets).where(eq(privyWallets.id, id)).limit(1);
    return wallet || null;
  },

  async privyGetWalletByBotId(botId: string): Promise<PrivyWallet | null> {
    const [wallet] = await db.select().from(privyWallets).where(eq(privyWallets.botId, botId)).limit(1);
    return wallet || null;
  },

  async privyGetWalletsByOwnerUid(ownerUid: string): Promise<PrivyWallet[]> {
    return db.select().from(privyWallets).where(eq(privyWallets.ownerUid, ownerUid)).orderBy(desc(privyWallets.createdAt));
  },

  async privyGetWalletByAddress(address: string): Promise<PrivyWallet | null> {
    const [wallet] = await db
      .select()
      .from(privyWallets)
      .where(sql`LOWER(${privyWallets.address}) = LOWER(${address})`)
      .limit(1);
    return wallet || null;
  },

  async privyUpdateWalletBalance(id: number, balanceUsdc: number): Promise<PrivyWallet | null> {
    const [updated] = await db
      .update(privyWallets)
      .set({ balanceUsdc, updatedAt: new Date() })
      .where(eq(privyWallets.id, id))
      .returning();
    return updated || null;
  },

  async privyUpdateWalletStatus(id: number, status: string, ownerUid: string): Promise<PrivyWallet | null> {
    const [updated] = await db
      .update(privyWallets)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(privyWallets.id, id), eq(privyWallets.ownerUid, ownerUid)))
      .returning();
    return updated || null;
  },

  async privyUnlinkBot(id: number, ownerUid: string): Promise<PrivyWallet | null> {
    const [updated] = await db
      .update(privyWallets)
      .set({ botId: "", updatedAt: new Date() })
      .where(and(eq(privyWallets.id, id), eq(privyWallets.ownerUid, ownerUid)))
      .returning();
    return updated || null;
  },

  async privyLinkBot(id: number, botId: string, ownerUid: string): Promise<PrivyWallet | null> {
    const [updated] = await db
      .update(privyWallets)
      .set({ botId, updatedAt: new Date() })
      .where(and(eq(privyWallets.id, id), eq(privyWallets.ownerUid, ownerUid)))
      .returning();
    return updated || null;
  },

  async privyUpdateWalletBalanceAndSync(id: number, balanceUsdc: number): Promise<PrivyWallet | null> {
    const [updated] = await db
      .update(privyWallets)
      .set({ balanceUsdc, lastSyncedAt: new Date(), updatedAt: new Date() })
      .where(eq(privyWallets.id, id))
      .returning();
    return updated || null;
  },

  async privyUpdateWalletSyncedAt(id: number): Promise<void> {
    await db
      .update(privyWallets)
      .set({ lastSyncedAt: new Date() })
      .where(eq(privyWallets.id, id));
  },

  async privyGetGuardrails(walletId: number): Promise<PrivyGuardrail | null> {
    const [g] = await db.select().from(privyGuardrails).where(eq(privyGuardrails.walletId, walletId)).limit(1);
    return g || null;
  },

  async privyUpsertGuardrails(walletId: number, data: Partial<InsertPrivyGuardrail>): Promise<PrivyGuardrail> {
    const existing = await this.privyGetGuardrails(walletId);
    if (existing) {
      const [updated] = await db
        .update(privyGuardrails)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(privyGuardrails.walletId, walletId))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(privyGuardrails)
      .values({ walletId, ...data })
      .returning();
    return created;
  },

  async privyCreateTransaction(data: InsertPrivyTransaction): Promise<PrivyTransaction> {
    const [tx] = await db.insert(privyTransactions).values(data).returning();
    return tx;
  },

  async privyGetTransactionsByWalletId(walletId: number, limit = 50): Promise<PrivyTransaction[]> {
    return db
      .select()
      .from(privyTransactions)
      .where(eq(privyTransactions.walletId, walletId))
      .orderBy(desc(privyTransactions.createdAt))
      .limit(limit);
  },

  async privyUpdateTransactionStatus(id: number, status: string, txHash?: string): Promise<PrivyTransaction | null> {
    const updateData: Record<string, unknown> = { status };
    if (txHash) updateData.txHash = txHash;
    if (status === "confirmed") updateData.confirmedAt = new Date();
    const [updated] = await db
      .update(privyTransactions)
      .set(updateData)
      .where(eq(privyTransactions.id, id))
      .returning();
    return updated || null;
  },

  async privyGetDailySpend(walletId: number): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = await db
      .select({ total: sql<number>`COALESCE(SUM(${privyTransactions.amountUsdc}), 0)` })
      .from(privyTransactions)
      .where(and(
        eq(privyTransactions.walletId, walletId),
        eq(privyTransactions.type, "x402_payment"),
        gte(privyTransactions.createdAt, today),
      ));
    return Number(result[0]?.total || 0);
  },

  async privyGetMonthlySpend(walletId: number): Promise<number> {
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);
    const result = await db
      .select({ total: sql<number>`COALESCE(SUM(${privyTransactions.amountUsdc}), 0)` })
      .from(privyTransactions)
      .where(and(
        eq(privyTransactions.walletId, walletId),
        eq(privyTransactions.type, "x402_payment"),
        gte(privyTransactions.createdAt, firstOfMonth),
      ));
    return Number(result[0]?.total || 0);
  },

};
