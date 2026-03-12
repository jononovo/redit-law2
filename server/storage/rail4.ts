import { db } from "@/server/db";
import {
  rail4Cards, obfuscationEvents, obfuscationState, profileAllowanceUsage, checkoutConfirmations,
  type Rail4Card, type InsertRail4Card,
  type ObfuscationEvent, type InsertObfuscationEvent,
  type ObfuscationState, type InsertObfuscationState,
  type ProfileAllowanceUsage,
  type CheckoutConfirmation, type InsertCheckoutConfirmation,
} from "@/shared/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import type { IStorage } from "./types";

type Rail4Methods = Pick<IStorage,
  | "createRail4Card" | "getRail4CardByCardId" | "getRail4CardByBotId" | "getRail4CardsByBotId"
  | "countCardsByBotId" | "getRail4CardsByOwnerUid" | "updateRail4CardByCardId"
  | "updateRail4Card" | "deleteRail4CardByCardId" | "deleteRail4Card"
  | "createObfuscationEvent" | "getObfuscationEventsByCardId" | "getObfuscationEventsByBotId"
  | "getPendingObfuscationEvents" | "completeObfuscationEvent" | "updateObfuscationEventConfirmation"
  | "getObfuscationState" | "createObfuscationState" | "updateObfuscationState" | "getActiveObfuscationStates"
  | "getProfileAllowanceUsage" | "upsertProfileAllowanceUsage"
  | "createCheckoutConfirmation" | "getCheckoutConfirmation" | "updateCheckoutConfirmationStatus"
  | "getPendingConfirmationsByBotIds" | "getPendingConfirmationsByCardIds"
>;

export const rail4Methods: Rail4Methods = {
  async createRail4Card(data: InsertRail4Card): Promise<Rail4Card> {
    const [card] = await db.insert(rail4Cards).values(data).returning();
    return card;
  },

  async getRail4CardByCardId(cardId: string): Promise<Rail4Card | null> {
    const [card] = await db.select().from(rail4Cards).where(eq(rail4Cards.cardId, cardId)).limit(1);
    return card || null;
  },

  async getRail4CardByBotId(botId: string): Promise<Rail4Card | null> {
    const [card] = await db.select().from(rail4Cards).where(eq(rail4Cards.botId, botId)).limit(1);
    return card || null;
  },

  async getRail4CardsByBotId(botId: string): Promise<Rail4Card[]> {
    return db.select().from(rail4Cards).where(eq(rail4Cards.botId, botId)).orderBy(desc(rail4Cards.createdAt));
  },

  async countCardsByBotId(botId: string): Promise<number> {
    const cards = await db.select().from(rail4Cards).where(eq(rail4Cards.botId, botId));
    return cards.length;
  },

  async getRail4CardsByOwnerUid(ownerUid: string): Promise<Rail4Card[]> {
    return db.select().from(rail4Cards).where(eq(rail4Cards.ownerUid, ownerUid)).orderBy(desc(rail4Cards.createdAt));
  },

  async updateRail4CardByCardId(cardId: string, data: Partial<InsertRail4Card>): Promise<Rail4Card | null> {
    const [updated] = await db
      .update(rail4Cards)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(rail4Cards.cardId, cardId))
      .returning();
    return updated || null;
  },

  async updateRail4Card(botId: string, data: Partial<InsertRail4Card>): Promise<Rail4Card | null> {
    const [updated] = await db
      .update(rail4Cards)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(rail4Cards.botId, botId))
      .returning();
    return updated || null;
  },

  async deleteRail4CardByCardId(cardId: string): Promise<void> {
    await db.delete(rail4Cards).where(eq(rail4Cards.cardId, cardId));
  },

  async deleteRail4Card(botId: string): Promise<void> {
    await db.delete(rail4Cards).where(eq(rail4Cards.botId, botId));
  },

  async createObfuscationEvent(data: InsertObfuscationEvent): Promise<ObfuscationEvent> {
    const [event] = await db.insert(obfuscationEvents).values(data).returning();
    return event;
  },

  async getObfuscationEventsByCardId(cardId: string, limit = 50): Promise<ObfuscationEvent[]> {
    return db
      .select()
      .from(obfuscationEvents)
      .where(eq(obfuscationEvents.cardId, cardId))
      .orderBy(desc(obfuscationEvents.createdAt))
      .limit(limit);
  },

  async getObfuscationEventsByBotId(botId: string, limit = 50): Promise<ObfuscationEvent[]> {
    return db
      .select()
      .from(obfuscationEvents)
      .where(eq(obfuscationEvents.botId, botId))
      .orderBy(desc(obfuscationEvents.createdAt))
      .limit(limit);
  },

  async getPendingObfuscationEvents(cardId: string): Promise<ObfuscationEvent[]> {
    return db
      .select()
      .from(obfuscationEvents)
      .where(and(eq(obfuscationEvents.cardId, cardId), eq(obfuscationEvents.status, "pending")))
      .orderBy(obfuscationEvents.createdAt);
  },

  async completeObfuscationEvent(id: number, occurredAt: Date): Promise<ObfuscationEvent | null> {
    const [updated] = await db
      .update(obfuscationEvents)
      .set({ status: "completed", occurredAt })
      .where(and(eq(obfuscationEvents.id, id), eq(obfuscationEvents.status, "pending")))
      .returning();
    return updated || null;
  },

  async updateObfuscationEventConfirmation(id: number, confirmationId: string): Promise<void> {
    await db
      .update(obfuscationEvents)
      .set({ confirmationId })
      .where(eq(obfuscationEvents.id, id));
  },

  async getObfuscationState(cardId: string): Promise<ObfuscationState | null> {
    const [state] = await db.select().from(obfuscationState).where(eq(obfuscationState.cardId, cardId)).limit(1);
    return state || null;
  },

  async createObfuscationState(data: InsertObfuscationState): Promise<ObfuscationState> {
    const [state] = await db.insert(obfuscationState).values(data).returning();
    return state;
  },

  async updateObfuscationState(cardId: string, data: Partial<InsertObfuscationState>): Promise<ObfuscationState | null> {
    const [updated] = await db
      .update(obfuscationState)
      .set(data)
      .where(eq(obfuscationState.cardId, cardId))
      .returning();
    return updated || null;
  },

  async getActiveObfuscationStates(): Promise<ObfuscationState[]> {
    return db
      .select()
      .from(obfuscationState)
      .where(eq(obfuscationState.active, true));
  },

  async getProfileAllowanceUsage(cardId: string, profileIndex: number, windowStart: Date): Promise<ProfileAllowanceUsage | null> {
    const [usage] = await db
      .select()
      .from(profileAllowanceUsage)
      .where(and(
        eq(profileAllowanceUsage.cardId, cardId),
        eq(profileAllowanceUsage.profileIndex, profileIndex),
        eq(profileAllowanceUsage.windowStart, windowStart),
      ))
      .limit(1);
    return usage || null;
  },

  async upsertProfileAllowanceUsage(cardId: string, profileIndex: number, windowStart: Date, addCents: number, markExemptUsed = false): Promise<ProfileAllowanceUsage> {
    const existing = await this.getProfileAllowanceUsage(cardId, profileIndex, windowStart);
    if (existing) {
      const updateData: Record<string, unknown> = {
        spentCents: sql`${profileAllowanceUsage.spentCents} + ${addCents}`,
      };
      if (markExemptUsed) {
        updateData.exemptUsed = true;
      }
      const [updated] = await db
        .update(profileAllowanceUsage)
        .set(updateData)
        .where(eq(profileAllowanceUsage.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(profileAllowanceUsage)
      .values({
        cardId,
        profileIndex,
        windowStart,
        spentCents: addCents,
        exemptUsed: markExemptUsed,
      })
      .returning();
    return created;
  },

  async createCheckoutConfirmation(data: InsertCheckoutConfirmation): Promise<CheckoutConfirmation> {
    const [conf] = await db.insert(checkoutConfirmations).values(data).returning();
    return conf;
  },

  async getCheckoutConfirmation(confirmationId: string): Promise<CheckoutConfirmation | null> {
    const [conf] = await db
      .select()
      .from(checkoutConfirmations)
      .where(eq(checkoutConfirmations.confirmationId, confirmationId))
      .limit(1);
    return conf || null;
  },

  async updateCheckoutConfirmationStatus(confirmationId: string, status: string): Promise<CheckoutConfirmation | null> {
    const [updated] = await db
      .update(checkoutConfirmations)
      .set({ status, decidedAt: new Date() })
      .where(eq(checkoutConfirmations.confirmationId, confirmationId))
      .returning();
    return updated || null;
  },

  async getPendingConfirmationsByBotIds(botIds: string[]): Promise<CheckoutConfirmation[]> {
    if (botIds.length === 0) return [];
    return db
      .select()
      .from(checkoutConfirmations)
      .where(and(
        inArray(checkoutConfirmations.botId, botIds),
        eq(checkoutConfirmations.status, "pending"),
      ))
      .orderBy(desc(checkoutConfirmations.createdAt));
  },

  async getPendingConfirmationsByCardIds(cardIds: string[]): Promise<CheckoutConfirmation[]> {
    if (cardIds.length === 0) return [];
    return db
      .select()
      .from(checkoutConfirmations)
      .where(and(
        inArray(checkoutConfirmations.cardId, cardIds),
        eq(checkoutConfirmations.status, "pending"),
      ))
      .orderBy(desc(checkoutConfirmations.createdAt));
  },
};
