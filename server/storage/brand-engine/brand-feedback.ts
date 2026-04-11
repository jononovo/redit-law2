import { db } from "@/server/db";
import { brandFeedback, type BrandFeedback, type InsertBrandFeedback } from "@/shared/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import type { IStorage } from "../types";

type BrandFeedbackMethods = Pick<IStorage,
  | "createBrandFeedback"
  | "getBrandFeedback"
  | "getBrandFeedbackCount"
  | "getRecentFeedbackByBot"
>;

export const brandFeedbackMethods: BrandFeedbackMethods = {
  async createBrandFeedback(data: InsertBrandFeedback): Promise<BrandFeedback> {
    const [row] = await db.insert(brandFeedback).values(data).returning();
    return row;
  },

  async getBrandFeedback(brandSlug: string, limit = 50): Promise<BrandFeedback[]> {
    return db.select()
      .from(brandFeedback)
      .where(eq(brandFeedback.brandSlug, brandSlug))
      .orderBy(desc(brandFeedback.createdAt))
      .limit(limit);
  },

  async getBrandFeedbackCount(brandSlug: string): Promise<number> {
    const [row] = await db.select({ total: sql<number>`count(*)::int` })
      .from(brandFeedback)
      .where(eq(brandFeedback.brandSlug, brandSlug));
    return row?.total ?? 0;
  },

  async getRecentFeedbackByBot(brandSlug: string, botId: string, windowHours = 1): Promise<BrandFeedback | null> {
    const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000);
    const [row] = await db.select()
      .from(brandFeedback)
      .where(and(
        eq(brandFeedback.brandSlug, brandSlug),
        eq(brandFeedback.botId, botId),
        gte(brandFeedback.createdAt, cutoff),
      ))
      .orderBy(desc(brandFeedback.createdAt))
      .limit(1);
    return row ?? null;
  },
};
