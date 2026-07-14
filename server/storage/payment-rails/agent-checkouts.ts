import { db } from "@/server/db";
import {
  bots, agentCheckouts, owners,
  type Bot,
  type AgentCheckout, type InsertAgentCheckout,
} from "@/shared/schema";
import { eq, and, desc, inArray, notInArray, sql } from "drizzle-orm";
import { generateBotId, generateApiKey, hashApiKey, getApiKeyPrefix } from "@/features/platform-management/agent-management/crypto";
import { INHOUSE_AGENT_NAME, INHOUSE_BOT_TYPE, INHOUSE_AGENT_DESCRIPTION } from "@/lib/inhouse-agent";
import { AGENT_CHECKOUT_TERMINAL_STATUSES } from "@/lib/agent-checkouts";
import type { IStorage } from "../types";

type AgentCheckoutMethods = Pick<IStorage,
  | "ensureInhouseBot"
  | "createAgentCheckout" | "getAgentCheckoutByCheckoutId"
  | "getAgentCheckoutsByOwnerUid" | "updateAgentCheckout"
  | "claimAgentCheckoutCardMint" | "claimAgentCheckoutSuccess" | "setOwnerBuyerProfileId"
  | "setOwnerDefaultCheckoutCard"
>;

const CARD_MINT_CLAIMABLE = ["created", "running", "awaiting_user_action"];

export const agentCheckoutMethods: AgentCheckoutMethods = {
  // One in-house agent per owner. Select-first (hot path — bots/mine), insert
  // on miss; the partial unique index bots_inhouse_owner_uidx makes the race
  // safe: the loser's onConflictDoNothing insert returns nothing and the
  // re-select finds the winner's row.
  async ensureInhouseBot(ownerUid: string, ownerEmail: string): Promise<Bot> {
    const inhouseFilter = and(eq(bots.ownerUid, ownerUid), eq(bots.botType, INHOUSE_BOT_TYPE));

    const [existing] = await db.select().from(bots).where(inhouseFilter).limit(1);
    if (existing) return existing;

    // The API key is generated only to satisfy notNull columns — it is never
    // returned or stored in plaintext, so nothing can ever authenticate as
    // the in-house bot through the bot API.
    const discardedKey = generateApiKey();
    const [inserted] = await db
      .insert(bots)
      .values({
        botId: generateBotId(),
        botName: INHOUSE_AGENT_NAME,
        description: INHOUSE_AGENT_DESCRIPTION,
        ownerEmail,
        ownerUid,
        apiKeyHash: await hashApiKey(discardedKey),
        apiKeyPrefix: getApiKeyPrefix(discardedKey),
        claimToken: null,
        walletStatus: "active",
        botType: INHOUSE_BOT_TYPE,
        agentPlatform: null,
        claimedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();
    if (inserted) return inserted;

    const [raced] = await db.select().from(bots).where(inhouseFilter).limit(1);
    if (!raced) throw new Error("ensureInhouseBot: insert conflicted but no row found");
    return raced;
  },

  async createAgentCheckout(data: InsertAgentCheckout): Promise<AgentCheckout> {
    const [row] = await db.insert(agentCheckouts).values(data).returning();
    return row;
  },

  async getAgentCheckoutByCheckoutId(checkoutId: string): Promise<AgentCheckout | null> {
    const [row] = await db.select().from(agentCheckouts).where(eq(agentCheckouts.checkoutId, checkoutId)).limit(1);
    return row || null;
  },

  async getAgentCheckoutsByOwnerUid(ownerUid: string, limit = 50): Promise<AgentCheckout[]> {
    return db
      .select()
      .from(agentCheckouts)
      .where(eq(agentCheckouts.ownerUid, ownerUid))
      .orderBy(desc(agentCheckouts.createdAt))
      .limit(limit);
  },

  async updateAgentCheckout(checkoutId: string, data: Partial<InsertAgentCheckout>): Promise<AgentCheckout | null> {
    const [row] = await db
      .update(agentCheckouts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(agentCheckouts.checkoutId, checkoutId))
      .returning();
    return row || null;
  },

  // Atomic claim for minting a one-time card credential. Wins ONLY if the
  // checkout is in a non-minting, non-terminal status AND we have not already
  // answered this exact action id. Both guards matter:
  //   - status ∉ {minting_card, terminal}  → concurrent polls can't double-claim
  //   - answered_action_id ≠ actionId       → a still-pending action after a
  //     completed (or crashed post-mint) attempt can't trigger a second mint
  // The winner gets the row; everyone else gets null.
  async claimAgentCheckoutCardMint(checkoutId: string, actionId: string): Promise<AgentCheckout | null> {
    const [row] = await db
      .update(agentCheckouts)
      .set({ status: "minting_card", updatedAt: new Date() })
      .where(and(
        eq(agentCheckouts.checkoutId, checkoutId),
        inArray(agentCheckouts.status, CARD_MINT_CLAIMABLE),
        sql`${agentCheckouts.answeredActionId} IS DISTINCT FROM ${actionId}`,
      ))
      .returning();
    return row || null;
  },

  // Atomic claim for finalizing success — only the first poll to see the
  // terminal "succeeded" from Crossmint records the order / charges the tx.
  async claimAgentCheckoutSuccess(checkoutId: string): Promise<AgentCheckout | null> {
    const [row] = await db
      .update(agentCheckouts)
      .set({ status: "succeeded", updatedAt: new Date() })
      .where(and(
        eq(agentCheckouts.checkoutId, checkoutId),
        notInArray(agentCheckouts.status, [...AGENT_CHECKOUT_TERMINAL_STATUSES]),
      ))
      .returning();
    return row || null;
  },

  async setOwnerBuyerProfileId(ownerUid: string, buyerProfileId: string): Promise<void> {
    await db
      .update(owners)
      .set({ crossmintBuyerProfileId: buyerProfileId, updatedAt: new Date() })
      .where(eq(owners.uid, ownerUid));
  },

  async setOwnerDefaultCheckoutCard(ownerUid: string, cardId: string | null): Promise<void> {
    await db
      .update(owners)
      .set({ defaultAgentCheckoutCardId: cardId, updatedAt: new Date() })
      .where(eq(owners.uid, ownerUid));
  },
};
