import { db } from "@/server/db";
import {
  rail4Guardrails, checkoutConfirmations,
  type Rail4Guardrail, type InsertRail4Guardrail,
} from "@/shared/schema";
import { eq, and, sql, gte } from "drizzle-orm";
import type { IStorage } from "./types";

type Rail4GuardrailMethods = Pick<IStorage,
  "getRail4Guardrails" | "upsertRail4Guardrails" | "getRail4DailySpendCents" | "getRail4MonthlySpendCents"
>;

export const rail4GuardrailMethods: Rail4GuardrailMethods = {
  async getRail4Guardrails(cardId: string): Promise<Rail4Guardrail | null> {
    const [row] = await db.select().from(rail4Guardrails).where(eq(rail4Guardrails.cardId, cardId)).limit(1);
    return row || null;
  },

  async upsertRail4Guardrails(cardId: string, data: Partial<InsertRail4Guardrail>): Promise<Rail4Guardrail> {
    const existing = await this.getRail4Guardrails(cardId);
    if (existing) {
      const [updated] = await db
        .update(rail4Guardrails)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(rail4Guardrails.cardId, cardId))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(rail4Guardrails)
      .values({ cardId, ...data })
      .returning();
    return created;
  },

  async getRail4DailySpendCents(cardId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [result] = await db
      .select({ total: sql<number>`COALESCE(SUM(${checkoutConfirmations.amountCents}), 0)` })
      .from(checkoutConfirmations)
      .where(and(
        eq(checkoutConfirmations.cardId, cardId),
        eq(checkoutConfirmations.status, "approved"),
        gte(checkoutConfirmations.createdAt, startOfDay),
      ));
    return Number(result?.total || 0);
  },

  async getRail4MonthlySpendCents(cardId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [result] = await db
      .select({ total: sql<number>`COALESCE(SUM(${checkoutConfirmations.amountCents}), 0)` })
      .from(checkoutConfirmations)
      .where(and(
        eq(checkoutConfirmations.cardId, cardId),
        eq(checkoutConfirmations.status, "approved"),
        gte(checkoutConfirmations.createdAt, startOfMonth),
      ));
    return Number(result?.total || 0);
  },
};
