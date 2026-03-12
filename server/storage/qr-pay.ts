import { db } from "@/server/db";
import { qrPayments } from "@/shared/schema";
import type { QrPayment, InsertQrPayment } from "@/shared/schema";
import type { IStorage } from "./types";
import { eq, and } from "drizzle-orm";

type QrPayMethods = Pick<IStorage,
  | "createQrPayment"
  | "getQrPaymentById"
  | "confirmQrPayment"
  | "expireQrPayment"
  | "expireWaitingQrPaymentsForWallet"
>;

export const qrPayMethods: QrPayMethods = {
  async createQrPayment(data: InsertQrPayment): Promise<QrPayment> {
    const [payment] = await db.insert(qrPayments).values(data).returning();
    return payment;
  },

  async getQrPaymentById(paymentId: string): Promise<QrPayment | null> {
    const [payment] = await db
      .select()
      .from(qrPayments)
      .where(eq(qrPayments.paymentId, paymentId))
      .limit(1);
    return payment || null;
  },

  async confirmQrPayment(
    paymentId: string,
    creditedUsdc: number,
    confirmedAt: Date,
  ): Promise<QrPayment | null> {
    const [updated] = await db
      .update(qrPayments)
      .set({ status: "confirmed", creditedUsdc, confirmedAt })
      .where(and(eq(qrPayments.paymentId, paymentId), eq(qrPayments.status, "waiting")))
      .returning();
    return updated || null;
  },

  async expireQrPayment(paymentId: string): Promise<QrPayment | null> {
    const [updated] = await db
      .update(qrPayments)
      .set({ status: "expired" })
      .where(and(eq(qrPayments.paymentId, paymentId), eq(qrPayments.status, "waiting")))
      .returning();
    return updated || null;
  },

  async expireWaitingQrPaymentsForWallet(walletAddress: string): Promise<number> {
    const result = await db
      .update(qrPayments)
      .set({ status: "expired" })
      .where(and(eq(qrPayments.walletAddress, walletAddress), eq(qrPayments.status, "waiting")))
      .returning();
    return result.length;
  },
};
