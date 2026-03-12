import { db } from "@/server/db";
import {
  rail5Guardrails, rail5Checkouts,
  type Rail5Guardrail, type InsertRail5Guardrail,
} from "@/shared/schema";
import { eq, and, sql, gte } from "drizzle-orm";
import type { IStorage } from "./types";

type Rail5GuardrailMethods = Pick<IStorage,
  "getRail5Guardrails" | "upsertRail5Guardrails" | "getRail5DailySpendCents" | "getRail5MonthlySpendCents"
>;

export const rail5GuardrailMethods: Rail5GuardrailMethods = {
  async getRail5Guardrails(cardId: string): Promise<Rail5Guardrail | null> {
    const [row] = await db.select().from(rail5Guardrails).where(eq(rail5Guardrails.cardId, cardId)).limit(1);
    return row || null;
  },

  async upsertRail5Guardrails(cardId: string, data: Partial<InsertRail5Guardrail>): Promise<Rail5Guardrail> {
    const existing = await this.getRail5Guardrails(cardId);
    if (existing) {
      const [updated] = await db
        .update(rail5Guardrails)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(rail5Guardrails.cardId, cardId))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(rail5Guardrails)
      .values({ cardId, ...data })
      .returning();
    return created;
  },

  async getRail5DailySpendCents(cardId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [result] = await db
      .select({ total: sql<number>`COALESCE(SUM(${rail5Checkouts.amountCents}), 0)` })
      .from(rail5Checkouts)
      .where(and(
        eq(rail5Checkouts.cardId, cardId),
        eq(rail5Checkouts.status, "approved"),
        gte(rail5Checkouts.createdAt, startOfDay),
      ));
    return Number(result?.total || 0);
  },

  async getRail5MonthlySpendCents(cardId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [result] = await db
      .select({ total: sql<number>`COALESCE(SUM(${rail5Checkouts.amountCents}), 0)` })
      .from(rail5Checkouts)
      .where(and(
        eq(rail5Checkouts.cardId, cardId),
        eq(rail5Checkouts.status, "approved"),
        gte(rail5Checkouts.createdAt, startOfMonth),
      ));
    return Number(result?.total || 0);
  },
};
