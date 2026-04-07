import { db } from "@/server/db";
import { basePayPayments } from "@/shared/schema";
import type { BasePayPayment, InsertBasePayPayment } from "@/shared/schema";
import type { IStorage } from "./types";
import { eq } from "drizzle-orm";

type BasePayMethods = Pick<IStorage,
  | "createBasePayPayment"
  | "getBasePayPaymentByTxId"
  | "updateBasePayPaymentStatus"
>;

export const basePayMethods: BasePayMethods = {
  async createBasePayPayment(data: InsertBasePayPayment): Promise<BasePayPayment> {
    const [payment] = await db.insert(basePayPayments).values(data).returning();
    return payment;
  },

  async getBasePayPaymentByTxId(txId: string): Promise<BasePayPayment | null> {
    const [payment] = await db.select().from(basePayPayments).where(eq(basePayPayments.txId, txId)).limit(1);
    return payment || null;
  },

  async updateBasePayPaymentStatus(txId: string, status: string, confirmedAt?: Date): Promise<BasePayPayment | null> {
    const updates: Partial<InsertBasePayPayment> = { status };
    if (confirmedAt) {
      updates.confirmedAt = confirmedAt;
    }
    const [updated] = await db.update(basePayPayments).set(updates).where(eq(basePayPayments.txId, txId)).returning();
    return updated || null;
  },
};
