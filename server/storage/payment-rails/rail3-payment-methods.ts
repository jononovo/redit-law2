import { db } from "@/server/db";
import {
  rail3PaymentMethods,
  type Rail3PaymentMethod, type InsertRail3PaymentMethod,
} from "@/shared/schema";
import { eq, desc, and } from "drizzle-orm";
import type { IStorage } from "../types";

type Rail3PaymentMethodMethods = Pick<IStorage,
  | "createRail3PaymentMethod" | "getRail3PaymentMethodById" | "getRail3PaymentMethodsByOwnerUid"
  | "updateRail3PaymentMethod" | "deleteRail3PaymentMethod"
>;

export const rail3PaymentMethodMethods: Rail3PaymentMethodMethods = {
  async createRail3PaymentMethod(data: InsertRail3PaymentMethod): Promise<Rail3PaymentMethod> {
    const [pm] = await db.insert(rail3PaymentMethods).values(data).returning();
    return pm;
  },

  async getRail3PaymentMethodById(paymentMethodId: string): Promise<Rail3PaymentMethod | null> {
    const [pm] = await db.select().from(rail3PaymentMethods).where(eq(rail3PaymentMethods.paymentMethodId, paymentMethodId)).limit(1);
    return pm || null;
  },

  async getRail3PaymentMethodsByOwnerUid(ownerUid: string): Promise<Rail3PaymentMethod[]> {
    return db
      .select()
      .from(rail3PaymentMethods)
      .where(and(eq(rail3PaymentMethods.ownerUid, ownerUid), eq(rail3PaymentMethods.status, "active")))
      .orderBy(desc(rail3PaymentMethods.lastUsedAt), desc(rail3PaymentMethods.createdAt));
  },

  async updateRail3PaymentMethod(paymentMethodId: string, data: Partial<InsertRail3PaymentMethod>): Promise<Rail3PaymentMethod | null> {
    const [updated] = await db
      .update(rail3PaymentMethods)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(rail3PaymentMethods.paymentMethodId, paymentMethodId))
      .returning();
    return updated || null;
  },

  async deleteRail3PaymentMethod(paymentMethodId: string): Promise<void> {
    await db.delete(rail3PaymentMethods).where(eq(rail3PaymentMethods.paymentMethodId, paymentMethodId));
  },
};
