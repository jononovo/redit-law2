import { db } from "@/server/db";
import { rail3Agents, type Rail3Agent, type InsertRail3Agent } from "@/shared/schema";
import { eq } from "drizzle-orm";
import type { IStorage } from "../types";

type Rail3AgentMethods = Pick<IStorage,
  | "getRail3AgentByBotId" | "createRail3Agent" | "deleteRail3AgentByBotId"
>;

export const rail3AgentMethods: Rail3AgentMethods = {
  async getRail3AgentByBotId(botId: string): Promise<Rail3Agent | null> {
    const [row] = await db.select().from(rail3Agents).where(eq(rail3Agents.botId, botId)).limit(1);
    return row || null;
  },

  async createRail3Agent(data: InsertRail3Agent): Promise<Rail3Agent> {
    const [row] = await db.insert(rail3Agents).values(data).returning();
    return row;
  },

  async deleteRail3AgentByBotId(botId: string): Promise<void> {
    await db.delete(rail3Agents).where(eq(rail3Agents.botId, botId));
  },
};
