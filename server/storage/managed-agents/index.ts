import { db } from "@/server/db";
import {
  bots, managedAgents, managedAgentCheckouts,
  type Bot,
  type ManagedAgent,
  type ManagedAgentCheckout, type InsertManagedAgentCheckout,
} from "@/shared/schema";
import { eq, and, desc, inArray, notInArray, sql } from "drizzle-orm";
import { generateBotId, generateApiKey, hashApiKey, getApiKeyPrefix } from "@/features/platform-management/agent-management/crypto";
import { MANAGED_BOT_TYPE, MANAGED_AGENT_RUNTIMES, type ManagedRuntime } from "@/lib/managed-agents";
import { AGENT_CHECKOUT_TERMINAL_STATUSES } from "@/lib/managed-agent-checkouts";
import type { IStorage } from "../types";

type ManagedAgentMethods = Pick<IStorage,
  | "ensureManagedAgent" | "getManagedAgent"
  | "setManagedAgentBuyerProfileId" | "setManagedAgentDefaultCard"
  | "createManagedAgentCheckout" | "getManagedAgentCheckoutByCheckoutId"
  | "getManagedAgentCheckoutsByOwnerUid" | "updateManagedAgentCheckout"
  | "claimManagedAgentCheckoutCardMint" | "claimManagedAgentCheckoutSuccess"
>;

const CARD_MINT_CLAIMABLE = ["created", "running", "awaiting_user_action"];

export const managedAgentMethods: ManagedAgentMethods = {
  // Get-or-create a managed agent for (owner, runtime) — BOTH the dashboard
  // bot row and the managed_agents settings row. Every write path funnels
  // through here so the settings row always exists before it's updated.
  //
  // Race safety: managed_agents_owner_runtime_uidx is the guard. Both inserts
  // run in one transaction, so a lost race (unique violation on managed_agents)
  // rolls back the bot insert too — no orphan bots — and we re-select the
  // winner's row. The managed_agents create is UNCONDITIONAL: we never skip it
  // just because a bot already exists (that would strand the settings row).
  async ensureManagedAgent(ownerUid: string, ownerEmail: string, runtime: string): Promise<ManagedAgent> {
    const filter = and(eq(managedAgents.ownerUid, ownerUid), eq(managedAgents.runtime, runtime));

    const [existing] = await db.select().from(managedAgents).where(filter).limit(1);
    if (existing) return existing;

    const branding = MANAGED_AGENT_RUNTIMES[runtime as ManagedRuntime];
    try {
      return await db.transaction(async (tx) => {
        // The API key is generated only to satisfy notNull columns — it is
        // never returned or stored in plaintext, so nothing can authenticate
        // as a managed bot through the bot API.
        const discardedKey = generateApiKey();
        const [bot] = await tx
          .insert(bots)
          .values({
            botId: generateBotId(),
            botName: branding?.displayName ?? "Managed agent",
            description: branding?.description ?? null,
            ownerEmail,
            ownerUid,
            apiKeyHash: await hashApiKey(discardedKey),
            apiKeyPrefix: getApiKeyPrefix(discardedKey),
            claimToken: null,
            walletStatus: "active",
            botType: MANAGED_BOT_TYPE,
            agentPlatform: null,
            claimedAt: new Date(),
          })
          .returning();

        const [agent] = await tx
          .insert(managedAgents)
          .values({ ownerUid, runtime, botId: bot.botId })
          .returning(); // unique violation here aborts the tx (rolls back the bot)
        return agent;
      });
    } catch {
      // Lost the race (or any insert failure) — the winner's row is committed.
      const [raced] = await db.select().from(managedAgents).where(filter).limit(1);
      if (!raced) throw new Error("ensureManagedAgent: insert failed and no row found");
      return raced;
    }
  },

  async getManagedAgent(ownerUid: string, runtime: string): Promise<ManagedAgent | null> {
    const [row] = await db
      .select()
      .from(managedAgents)
      .where(and(eq(managedAgents.ownerUid, ownerUid), eq(managedAgents.runtime, runtime)))
      .limit(1);
    return row || null;
  },

  async setManagedAgentBuyerProfileId(ownerUid: string, runtime: string, buyerProfileId: string): Promise<void> {
    await db
      .update(managedAgents)
      .set({ buyerProfileId, updatedAt: new Date() })
      .where(and(eq(managedAgents.ownerUid, ownerUid), eq(managedAgents.runtime, runtime)));
  },

  async setManagedAgentDefaultCard(ownerUid: string, runtime: string, cardId: string | null): Promise<void> {
    await db
      .update(managedAgents)
      .set({ defaultCardId: cardId, updatedAt: new Date() })
      .where(and(eq(managedAgents.ownerUid, ownerUid), eq(managedAgents.runtime, runtime)));
  },

  async createManagedAgentCheckout(data: InsertManagedAgentCheckout): Promise<ManagedAgentCheckout> {
    const [row] = await db.insert(managedAgentCheckouts).values(data).returning();
    return row;
  },

  async getManagedAgentCheckoutByCheckoutId(checkoutId: string): Promise<ManagedAgentCheckout | null> {
    const [row] = await db.select().from(managedAgentCheckouts).where(eq(managedAgentCheckouts.checkoutId, checkoutId)).limit(1);
    return row || null;
  },

  async getManagedAgentCheckoutsByOwnerUid(ownerUid: string, limit = 50): Promise<ManagedAgentCheckout[]> {
    return db
      .select()
      .from(managedAgentCheckouts)
      .where(eq(managedAgentCheckouts.ownerUid, ownerUid))
      .orderBy(desc(managedAgentCheckouts.createdAt))
      .limit(limit);
  },

  async updateManagedAgentCheckout(checkoutId: string, data: Partial<InsertManagedAgentCheckout>): Promise<ManagedAgentCheckout | null> {
    const [row] = await db
      .update(managedAgentCheckouts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(managedAgentCheckouts.checkoutId, checkoutId))
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
  async claimManagedAgentCheckoutCardMint(checkoutId: string, actionId: string): Promise<ManagedAgentCheckout | null> {
    const [row] = await db
      .update(managedAgentCheckouts)
      .set({ status: "minting_card", updatedAt: new Date() })
      .where(and(
        eq(managedAgentCheckouts.checkoutId, checkoutId),
        inArray(managedAgentCheckouts.status, CARD_MINT_CLAIMABLE),
        sql`${managedAgentCheckouts.answeredActionId} IS DISTINCT FROM ${actionId}`,
      ))
      .returning();
    return row || null;
  },

  // Atomic claim for finalizing success — only the first poll to see the
  // terminal "succeeded" from Crossmint records the order / charges the tx.
  async claimManagedAgentCheckoutSuccess(checkoutId: string): Promise<ManagedAgentCheckout | null> {
    const [row] = await db
      .update(managedAgentCheckouts)
      .set({ status: "succeeded", updatedAt: new Date() })
      .where(and(
        eq(managedAgentCheckouts.checkoutId, checkoutId),
        notInArray(managedAgentCheckouts.status, [...AGENT_CHECKOUT_TERMINAL_STATUSES]),
      ))
      .returning();
    return row || null;
  },
};
