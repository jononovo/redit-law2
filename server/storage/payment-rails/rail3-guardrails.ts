import { db } from "@/server/db";
import {
  rail3Guardrails, rail3Transactions,
  type Rail3Guardrail, type InsertRail3Guardrail,
} from "@/shared/schema";
import { eq, and, sql, gte } from "drizzle-orm";
import type { IStorage } from "../types";

type Rail3GuardrailMethods = Pick<IStorage,
  "getRail3Guardrails" | "upsertRail3Guardrails" | "getRail3DailySpendCents" | "getRail3MonthlySpendCents"
>;

export const rail3GuardrailMethods: Rail3GuardrailMethods = {
  async getRail3Guardrails(cardId: string): Promise<Rail3Guardrail | null> {
    const [row] = await db.select().from(rail3Guardrails).where(eq(rail3Guardrails.cardId, cardId)).limit(1);
    return row || null;
  },

  async upsertRail3Guardrails(cardId: string, data: Partial<InsertRail3Guardrail>): Promise<Rail3Guardrail> {
    const existing = await this.getRail3Guardrails(cardId);
    if (existing) {
      const [updated] = await db
        .update(rail3Guardrails)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(rail3Guardrails.cardId, cardId))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(rail3Guardrails)
      .values({ cardId, ...data })
      .returning();
    return created;
  },

  async getRail3DailySpendCents(cardId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [result] = await db
      .select({ total: sql<number>`COALESCE(SUM(${rail3Transactions.amountCents}), 0)` })
      .from(rail3Transactions)
      .where(and(
        eq(rail3Transactions.cardId, cardId),
        sql`${rail3Transactions.status} IN ('credentials_issued', 'charged')`,
        gte(rail3Transactions.createdAt, startOfDay),
      ));
    return Number(result?.total || 0);
  },

  async getRail3MonthlySpendCents(cardId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [result] = await db
      .select({ total: sql<number>`COALESCE(SUM(${rail3Transactions.amountCents}), 0)` })
      .from(rail3Transactions)
      .where(and(
        eq(rail3Transactions.cardId, cardId),
        sql`${rail3Transactions.status} IN ('credentials_issued', 'charged')`,
        gte(rail3Transactions.createdAt, startOfMonth),
      ));
    return Number(result?.total || 0);
  },
};
