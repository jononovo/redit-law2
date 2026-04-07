import { db } from "@/server/db";
import {
  pairingCodes, waitlistEntries,
  type PairingCode, type InsertPairingCode,
  type WaitlistEntry, type InsertWaitlistEntry,
} from "@/shared/schema";
import { eq, and, sql, gte } from "drizzle-orm";
import type { IStorage } from "./types";

type PairingWaitlistMethods = Pick<IStorage,
  | "createPairingCode" | "getPairingCodeByCode" | "claimPairingCode" | "getRecentPairingCodeCount"
  | "addWaitlistEntry" | "getWaitlistEntryByEmail"
>;

export const pairingWaitlistMethods: PairingWaitlistMethods = {
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
