import { db } from "@/server/db";
import {
  bots, wallets, transactions, paymentMethods, topupRequests, apiAccessLogs,
  reconciliationLogs,
  type InsertBot, type Bot,
  type Wallet, type InsertWallet,
  type Transaction, type InsertTransaction,
  type PaymentMethod, type InsertPaymentMethod,
  type TopupRequest, type InsertTopupRequest,
  type ApiAccessLog, type InsertApiAccessLog,
  type ReconciliationLog, type InsertReconciliationLog,
} from "@/shared/schema";
import { eq, and, isNull, desc, sql, gte, inArray } from "drizzle-orm";
import type { IStorage } from "./types";

type CoreMethods = Pick<IStorage,
  | "createBot" | "getBotByClaimToken" | "getBotByBotId" | "getBotsByOwnerEmail"
  | "getBotsByOwnerUid" | "claimBot" | "updateBotDefaultRail" | "checkDuplicateRegistration"
  | "updateBotWebhookHealth"
  | "createWallet" | "getWalletByBotId" | "getWalletByOwnerUid" | "creditWallet"
  | "createTransaction" | "getTransactionsByWalletId"
  | "getPaymentMethod" | "getPaymentMethods" | "getPaymentMethodById"
  | "addPaymentMethod" | "deletePaymentMethodById" | "setDefaultPaymentMethod"
  | "getBotsByApiKeyPrefix" | "debitWallet" | "getDailySpend" | "getMonthlySpend"
  | "createTopupRequest" | "createAccessLog" | "getAccessLogsByBotIds"
  | "getWalletsByOwnerUid" | "getTransactionSumByWalletId" | "createReconciliationLog"
  | "freezeWallet" | "unfreezeWallet" | "getWalletsWithBotsByOwnerUid"
>;

export const coreMethods: CoreMethods = {
  async createBot(data: InsertBot): Promise<Bot> {
    const [bot] = await db.insert(bots).values(data).returning();
    return bot;
  },

  async getBotByClaimToken(token: string): Promise<Bot | null> {
    const [bot] = await db.select().from(bots).where(eq(bots.claimToken, token)).limit(1);
    return bot || null;
  },

  async getBotByBotId(botId: string): Promise<Bot | null> {
    const [bot] = await db.select().from(bots).where(eq(bots.botId, botId)).limit(1);
    return bot || null;
  },

  async getBotsByOwnerEmail(email: string): Promise<Bot[]> {
    return db.select().from(bots).where(eq(bots.ownerEmail, email));
  },

  async getBotsByOwnerUid(ownerUid: string): Promise<Bot[]> {
    return db.select().from(bots).where(eq(bots.ownerUid, ownerUid));
  },

  async claimBot(claimToken: string, ownerUid: string): Promise<Bot | null> {
    const bot = await this.getBotByClaimToken(claimToken);
    if (!bot) return null;
    if (bot.ownerUid) return null;

    const [updated] = await db
      .update(bots)
      .set({
        ownerUid,
        walletStatus: "active",
        claimToken: null,
        claimedAt: new Date(),
      })
      .where(and(eq(bots.claimToken, claimToken), isNull(bots.ownerUid)))
      .returning();

    if (!updated) return null;

    await this.createWallet({
      botId: updated.botId,
      ownerUid,
    });

    return updated;
  },

  async updateBotDefaultRail(botId: string, ownerUid: string, defaultRail: string | null): Promise<Bot | null> {
    const [updated] = await db
      .update(bots)
      .set({ defaultRail })
      .where(and(eq(bots.botId, botId), eq(bots.ownerUid, ownerUid)))
      .returning();
    return updated || null;
  },

  async updateBotWebhookHealth(botId: string, status: string, failCount: number): Promise<void> {
    if (status === "active") {
      await db
        .update(bots)
        .set({ webhookStatus: "active", webhookFailCount: 0 })
        .where(eq(bots.botId, botId));
    } else {
      await db.execute(sql`
        UPDATE bots
        SET webhook_fail_count = webhook_fail_count + 1,
            webhook_status = CASE
              WHEN webhook_fail_count + 1 >= 2 THEN 'unreachable'
              ELSE 'degraded'
            END
        WHERE bot_id = ${botId}
      `);
    }
  },

  async checkDuplicateRegistration(botName: string, ownerEmail: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(bots)
      .where(and(eq(bots.botName, botName), eq(bots.ownerEmail, ownerEmail)))
      .limit(1);
    return !!existing;
  },

  async createWallet(data: InsertWallet): Promise<Wallet> {
    const [wallet] = await db.insert(wallets).values(data).returning();
    return wallet;
  },

  async getWalletByBotId(botId: string): Promise<Wallet | null> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.botId, botId)).limit(1);
    return wallet || null;
  },

  async getWalletByOwnerUid(ownerUid: string): Promise<Wallet | null> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.ownerUid, ownerUid)).limit(1);
    return wallet || null;
  },

  async creditWallet(walletId: number, amountCents: number): Promise<Wallet> {
    const [updated] = await db
      .update(wallets)
      .set({
        balanceCents: sql`${wallets.balanceCents} + ${amountCents}`,
        updatedAt: new Date(),
      })
      .where(eq(wallets.id, walletId))
      .returning();
    return updated;
  },

  async createTransaction(data: InsertTransaction): Promise<Transaction> {
    const [tx] = await db.insert(transactions).values(data).returning();
    return tx;
  },

  async getTransactionsByWalletId(walletId: number, limit = 50): Promise<Transaction[]> {
    return db
      .select()
      .from(transactions)
      .where(eq(transactions.walletId, walletId))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);
  },

  async getPaymentMethod(ownerUid: string): Promise<PaymentMethod | null> {
    const [pm] = await db.select().from(paymentMethods)
      .where(and(eq(paymentMethods.ownerUid, ownerUid), eq(paymentMethods.isDefault, true)))
      .limit(1);
    if (pm) return pm;
    const [any] = await db.select().from(paymentMethods)
      .where(eq(paymentMethods.ownerUid, ownerUid))
      .orderBy(desc(paymentMethods.createdAt))
      .limit(1);
    return any || null;
  },

  async getPaymentMethods(ownerUid: string): Promise<PaymentMethod[]> {
    return db.select().from(paymentMethods)
      .where(eq(paymentMethods.ownerUid, ownerUid))
      .orderBy(desc(paymentMethods.isDefault), desc(paymentMethods.createdAt));
  },

  async getPaymentMethodById(id: number, ownerUid: string): Promise<PaymentMethod | null> {
    const [pm] = await db.select().from(paymentMethods)
      .where(and(eq(paymentMethods.id, id), eq(paymentMethods.ownerUid, ownerUid)))
      .limit(1);
    return pm || null;
  },

  async addPaymentMethod(data: InsertPaymentMethod): Promise<PaymentMethod> {
    const existing = await this.getPaymentMethods(data.ownerUid);
    const shouldBeDefault = existing.length === 0;
    const [created] = await db.insert(paymentMethods).values({
      ...data,
      isDefault: shouldBeDefault,
    }).returning();
    return created;
  },

  async deletePaymentMethodById(id: number, ownerUid: string): Promise<void> {
    const pm = await this.getPaymentMethodById(id, ownerUid);
    if (!pm) return;
    await db.delete(paymentMethods).where(and(eq(paymentMethods.id, id), eq(paymentMethods.ownerUid, ownerUid)));
    if (pm.isDefault) {
      const [next] = await db.select().from(paymentMethods)
        .where(eq(paymentMethods.ownerUid, ownerUid))
        .orderBy(desc(paymentMethods.createdAt))
        .limit(1);
      if (next) {
        await db.update(paymentMethods).set({ isDefault: true }).where(eq(paymentMethods.id, next.id));
      }
    }
  },

  async setDefaultPaymentMethod(id: number, ownerUid: string): Promise<PaymentMethod | null> {
    const pm = await this.getPaymentMethodById(id, ownerUid);
    if (!pm) return null;
    await db.update(paymentMethods).set({ isDefault: false }).where(eq(paymentMethods.ownerUid, ownerUid));
    const [updated] = await db.update(paymentMethods).set({ isDefault: true }).where(eq(paymentMethods.id, id)).returning();
    return updated;
  },

  async getBotsByApiKeyPrefix(prefix: string): Promise<Bot[]> {
    return db.select().from(bots).where(eq(bots.apiKeyPrefix, prefix));
  },

  async debitWallet(walletId: number, amountCents: number): Promise<Wallet | null> {
    const [updated] = await db
      .update(wallets)
      .set({
        balanceCents: sql`${wallets.balanceCents} - ${amountCents}`,
        updatedAt: new Date(),
      })
      .where(and(eq(wallets.id, walletId), gte(wallets.balanceCents, amountCents)))
      .returning();
    return updated || null;
  },

  async getDailySpend(walletId: number): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = await db
      .select({ total: sql<number>`COALESCE(SUM(${transactions.amountCents}), 0)` })
      .from(transactions)
      .where(and(
        eq(transactions.walletId, walletId),
        eq(transactions.type, "purchase"),
        gte(transactions.createdAt, today)
      ));
    return Number(result[0]?.total || 0);
  },

  async getMonthlySpend(walletId: number): Promise<number> {
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);
    const result = await db
      .select({ total: sql<number>`COALESCE(SUM(${transactions.amountCents}), 0)` })
      .from(transactions)
      .where(and(
        eq(transactions.walletId, walletId),
        eq(transactions.type, "purchase"),
        gte(transactions.createdAt, firstOfMonth)
      ));
    return Number(result[0]?.total || 0);
  },


  async createTopupRequest(data: InsertTopupRequest): Promise<TopupRequest> {
    const [req] = await db.insert(topupRequests).values(data).returning();
    return req;
  },

  async createAccessLog(data: InsertApiAccessLog): Promise<void> {
    await db.insert(apiAccessLogs).values(data).catch((err) => {
      console.error("Failed to write access log:", err);
    });
  },

  async getAccessLogsByBotIds(botIds: string[], limit = 100): Promise<ApiAccessLog[]> {
    if (botIds.length === 0) return [];
    return db
      .select()
      .from(apiAccessLogs)
      .where(sql`${apiAccessLogs.botId} IN (${sql.join(botIds.map(id => sql`${id}`), sql`, `)})`)
      .orderBy(desc(apiAccessLogs.createdAt))
      .limit(limit);
  },

  async getWalletsByOwnerUid(ownerUid: string): Promise<Wallet[]> {
    return db.select().from(wallets).where(eq(wallets.ownerUid, ownerUid));
  },

  async getTransactionSumByWalletId(walletId: number): Promise<number> {
    const result = await db
      .select({
        topups: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('topup', 'payment_received') THEN ${transactions.amountCents} ELSE 0 END), 0)`,
        purchases: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'purchase' THEN ${transactions.amountCents} ELSE 0 END), 0)`,
      })
      .from(transactions)
      .where(eq(transactions.walletId, walletId));
    const topups = Number(result[0]?.topups || 0);
    const purchases = Number(result[0]?.purchases || 0);
    return topups - purchases;
  },

  async createReconciliationLog(data: InsertReconciliationLog): Promise<ReconciliationLog> {
    const [log] = await db.insert(reconciliationLogs).values(data).returning();
    return log;
  },

  async freezeWallet(walletId: number, ownerUid: string): Promise<Wallet | null> {
    const [updated] = await db
      .update(wallets)
      .set({ isFrozen: true, updatedAt: new Date() })
      .where(and(eq(wallets.id, walletId), eq(wallets.ownerUid, ownerUid)))
      .returning();
    return updated || null;
  },

  async unfreezeWallet(walletId: number, ownerUid: string): Promise<Wallet | null> {
    const [updated] = await db
      .update(wallets)
      .set({ isFrozen: false, updatedAt: new Date() })
      .where(and(eq(wallets.id, walletId), eq(wallets.ownerUid, ownerUid)))
      .returning();
    return updated || null;
  },

  async getWalletsWithBotsByOwnerUid(ownerUid: string): Promise<(Wallet & { botName: string; botId: string })[]> {
    const results = await db
      .select({
        id: wallets.id,
        botId: wallets.botId,
        ownerUid: wallets.ownerUid,
        balanceCents: wallets.balanceCents,
        currency: wallets.currency,
        isFrozen: wallets.isFrozen,
        createdAt: wallets.createdAt,
        updatedAt: wallets.updatedAt,
        botName: bots.botName,
      })
      .from(wallets)
      .innerJoin(bots, eq(wallets.botId, bots.botId))
      .where(eq(wallets.ownerUid, ownerUid))
      .orderBy(desc(wallets.createdAt));
    return results;
  },
};
