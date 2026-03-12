import { db } from "@/server/db";
import {
  paymentLinks, pairingCodes, waitlistEntries,
  type PaymentLink, type InsertPaymentLink,
  type PairingCode, type InsertPairingCode,
  type WaitlistEntry, type InsertWaitlistEntry,
} from "@/shared/schema";
import { eq, and, desc, sql, gte, inArray } from "drizzle-orm";
import type { IStorage } from "./types";

type PaymentLinkMethods = Pick<IStorage,
  | "createPaymentLink" | "getPaymentLinksByBotId" | "getPaymentLinkByStripeSession"
  | "getPaymentLinkByPaymentLinkId" | "getPaymentLinksByOwnerUid"
  | "updatePaymentLinkStatus" | "completePaymentLink"
  | "createPairingCode" | "getPairingCodeByCode" | "claimPairingCode" | "getRecentPairingCodeCount"
  | "addWaitlistEntry" | "getWaitlistEntryByEmail"
>;

export const paymentLinkMethods: PaymentLinkMethods = {
  async createPaymentLink(data: InsertPaymentLink): Promise<PaymentLink> {
    const [link] = await db.insert(paymentLinks).values(data).returning();
    return link;
  },

  async getPaymentLinksByBotId(botId: string, limit = 20, status?: string): Promise<PaymentLink[]> {
    const conditions = [eq(paymentLinks.botId, botId)];
    if (status) {
      conditions.push(eq(paymentLinks.status, status));
    }
    return db
      .select()
      .from(paymentLinks)
      .where(and(...conditions))
      .orderBy(desc(paymentLinks.createdAt))
      .limit(limit);
  },

  async getPaymentLinkByStripeSession(sessionId: string): Promise<PaymentLink | null> {
    const [link] = await db
      .select()
      .from(paymentLinks)
      .where(eq(paymentLinks.stripeCheckoutSessionId, sessionId))
      .limit(1);
    return link || null;
  },

  async getPaymentLinkByPaymentLinkId(paymentLinkId: string): Promise<PaymentLink | null> {
    const [link] = await db
      .select()
      .from(paymentLinks)
      .where(eq(paymentLinks.paymentLinkId, paymentLinkId))
      .limit(1);
    return link || null;
  },

  async getPaymentLinksByOwnerUid(ownerUid: string, limit = 50): Promise<PaymentLink[]> {
    const ownerBots = await (this as unknown as IStorage).getBotsByOwnerUid(ownerUid);
    if (ownerBots.length === 0) return [];
    const botIds = ownerBots.map((b: { botId: string }) => b.botId);
    return db
      .select()
      .from(paymentLinks)
      .where(inArray(paymentLinks.botId, botIds))
      .orderBy(desc(paymentLinks.createdAt))
      .limit(limit);
  },

  async updatePaymentLinkStatus(id: number, status: string, paidAt?: Date): Promise<PaymentLink | null> {
    const updateData: Record<string, unknown> = { status };
    if (paidAt) updateData.paidAt = paidAt;
    const [updated] = await db
      .update(paymentLinks)
      .set(updateData)
      .where(eq(paymentLinks.id, id))
      .returning();
    return updated || null;
  },

  async completePaymentLink(id: number): Promise<PaymentLink | null> {
    const [updated] = await db
      .update(paymentLinks)
      .set({ status: "completed", paidAt: new Date() })
      .where(and(eq(paymentLinks.id, id), eq(paymentLinks.status, "pending")))
      .returning();
    return updated || null;
  },

  async createPairingCode(data: InsertPairingCode): Promise<PairingCode> {
    const [code] = await db.insert(pairingCodes).values(data).returning();
    return code;
  },

  async getPairingCodeByCode(code: string): Promise<PairingCode | null> {
    const [pc] = await db.select().from(pairingCodes).where(eq(pairingCodes.code, code)).limit(1);
    return pc || null;
  },

  async claimPairingCode(code: string, botId: string): Promise<PairingCode | null> {
    const now = new Date();
    const [updated] = await db
      .update(pairingCodes)
      .set({ botId, status: "paired" })
      .where(and(
        eq(pairingCodes.code, code),
        eq(pairingCodes.status, "pending"),
        gte(pairingCodes.expiresAt, now),
      ))
      .returning();
    return updated || null;
  },

  async getRecentPairingCodeCount(ownerUid: string): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(pairingCodes)
      .where(and(
        eq(pairingCodes.ownerUid, ownerUid),
        gte(pairingCodes.createdAt, oneHourAgo),
      ));
    return Number(result[0]?.count || 0);
  },

  async addWaitlistEntry(data: InsertWaitlistEntry): Promise<WaitlistEntry> {
    const [entry] = await db
      .insert(waitlistEntries)
      .values(data)
      .onConflictDoNothing({ target: waitlistEntries.email })
      .returning();
    if (entry) return entry;
    const existing = await this.getWaitlistEntryByEmail(data.email);
    return existing!;
  },

  async getWaitlistEntryByEmail(email: string): Promise<WaitlistEntry | null> {
    const [entry] = await db.select().from(waitlistEntries).where(eq(waitlistEntries.email, email)).limit(1);
    return entry || null;
  },
};
