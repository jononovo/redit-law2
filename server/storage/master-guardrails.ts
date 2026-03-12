import { db } from "@/server/db";
import {
  masterGuardrails,
  privyTransactions, privyWallets,
  crossmintTransactions, crossmintWallets,
  checkoutConfirmations, rail4Cards,
  type MasterGuardrail, type InsertMasterGuardrail,
} from "@/shared/schema";
import { eq, and, sql, gte } from "drizzle-orm";
import type { IStorage } from "./types";

type MasterGuardrailMethods = Pick<IStorage,
  "getMasterGuardrails" | "upsertMasterGuardrails" | "getMasterDailySpend" | "getMasterMonthlySpend"
>;

export const masterGuardrailMethods: MasterGuardrailMethods = {
  async getMasterGuardrails(ownerUid: string): Promise<MasterGuardrail | null> {
    const [row] = await db.select().from(masterGuardrails).where(eq(masterGuardrails.ownerUid, ownerUid)).limit(1);
    return row || null;
  },

  async upsertMasterGuardrails(ownerUid: string, data: Partial<InsertMasterGuardrail>): Promise<MasterGuardrail> {
    const existing = await this.getMasterGuardrails(ownerUid);
    if (existing) {
      const [updated] = await db
        .update(masterGuardrails)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(masterGuardrails.ownerUid, ownerUid))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(masterGuardrails)
      .values({ ownerUid, ...data })
      .returning();
    return created;
  },

  async getMasterDailySpend(ownerUid: string): Promise<{ rail1: number; rail2: number; rail4: number; total: number }> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [r1] = await db
      .select({ total: sql<number>`COALESCE(SUM(${privyTransactions.amountUsdc}), 0)` })
      .from(privyTransactions)
      .innerJoin(privyWallets, eq(privyTransactions.walletId, privyWallets.id))
      .where(and(
        eq(privyWallets.ownerUid, ownerUid),
        eq(privyTransactions.type, "x402_payment"),
        gte(privyTransactions.createdAt, startOfDay),
        sql`${privyTransactions.status} NOT IN ('failed')`,
      ));

    const [r2] = await db
      .select({ total: sql<number>`COALESCE(SUM(${crossmintTransactions.amountUsdc}), 0)` })
      .from(crossmintTransactions)
      .innerJoin(crossmintWallets, eq(crossmintTransactions.walletId, crossmintWallets.id))
      .where(and(
        eq(crossmintWallets.ownerUid, ownerUid),
        eq(crossmintTransactions.type, "purchase"),
        gte(crossmintTransactions.createdAt, startOfDay),
        sql`${crossmintTransactions.status} NOT IN ('failed')`,
      ));

    const [r4] = await db
      .select({ total: sql<number>`COALESCE(SUM(${checkoutConfirmations.amountCents}), 0)` })
      .from(checkoutConfirmations)
      .innerJoin(rail4Cards, eq(checkoutConfirmations.cardId, rail4Cards.cardId))
      .where(and(
        eq(rail4Cards.ownerUid, ownerUid),
        eq(checkoutConfirmations.status, "approved"),
        gte(checkoutConfirmations.createdAt, startOfDay),
        eq(checkoutConfirmations.profileIndex, sql`${rail4Cards.realProfileIndex}`),
      ));

    const rail1 = Number(r1?.total || 0);
    const rail2 = Number(r2?.total || 0);
    const rail4Cents = Number(r4?.total || 0);
    const rail4 = rail4Cents * 10_000;
    return { rail1, rail2, rail4, total: rail1 + rail2 + rail4 };
  },

  async getMasterMonthlySpend(ownerUid: string): Promise<{ rail1: number; rail2: number; rail4: number; total: number }> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [r1] = await db
      .select({ total: sql<number>`COALESCE(SUM(${privyTransactions.amountUsdc}), 0)` })
      .from(privyTransactions)
      .innerJoin(privyWallets, eq(privyTransactions.walletId, privyWallets.id))
      .where(and(
        eq(privyWallets.ownerUid, ownerUid),
        eq(privyTransactions.type, "x402_payment"),
        gte(privyTransactions.createdAt, startOfMonth),
        sql`${privyTransactions.status} NOT IN ('failed')`,
      ));

    const [r2] = await db
      .select({ total: sql<number>`COALESCE(SUM(${crossmintTransactions.amountUsdc}), 0)` })
      .from(crossmintTransactions)
      .innerJoin(crossmintWallets, eq(crossmintTransactions.walletId, crossmintWallets.id))
      .where(and(
        eq(crossmintWallets.ownerUid, ownerUid),
        eq(crossmintTransactions.type, "purchase"),
        gte(crossmintTransactions.createdAt, startOfMonth),
        sql`${crossmintTransactions.status} NOT IN ('failed')`,
      ));

    const [r4] = await db
      .select({ total: sql<number>`COALESCE(SUM(${checkoutConfirmations.amountCents}), 0)` })
      .from(checkoutConfirmations)
      .innerJoin(rail4Cards, eq(checkoutConfirmations.cardId, rail4Cards.cardId))
      .where(and(
        eq(rail4Cards.ownerUid, ownerUid),
        eq(checkoutConfirmations.status, "approved"),
        gte(checkoutConfirmations.createdAt, startOfMonth),
        eq(checkoutConfirmations.profileIndex, sql`${rail4Cards.realProfileIndex}`),
      ));

    const rail1 = Number(r1?.total || 0);
    const rail2 = Number(r2?.total || 0);
    const rail4Cents = Number(r4?.total || 0);
    const rail4 = rail4Cents * 10_000;
    return { rail1, rail2, rail4, total: rail1 + rail2 + rail4 };
  },
};
