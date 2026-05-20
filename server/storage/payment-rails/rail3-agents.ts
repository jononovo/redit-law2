import { db } from "@/server/db";
import { rail3Agents, type Rail3Agent, type InsertRail3Agent } from "@/shared/schema";
import { eq } from "drizzle-orm";
import type { IStorage } from "../types";

type Rail3AgentMethods = Pick<IStorage,
  | "getRail3AgentByOwnerUid" | "insertRail3AgentIfAbsent"
>;

export const rail3AgentMethods: Rail3AgentMethods = {
  async getRail3AgentByOwnerUid(ownerUid: string): Promise<Rail3Agent | null> {
    const [row] = await db.select().from(rail3Agents).where(eq(rail3Agents.ownerUid, ownerUid)).limit(1);
    return row || null;
  },

  // Returns the inserted row, or null if a row already existed for this ownerUid.
  // Caller re-reads via getRail3AgentByOwnerUid on null (concurrent first-card race).
  async insertRail3AgentIfAbsent(data: InsertRail3Agent): Promise<Rail3Agent | null> {
    const [row] = await db.insert(rail3Agents).values(data).onConflictDoNothing().returning();
    return row || null;
  },
};
