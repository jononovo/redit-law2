import { eq, desc, and, gt } from "drizzle-orm";
import { db } from "@/server/db";
import {
  agentTestSessions,
  agentTestFieldEvents,
  type AgentTestSession,
  type InsertAgentTestSession,
  type AgentTestFieldEvent,
  type InsertAgentTestFieldEvent,
} from "@/shared/schema";

export const agentTestingMethods = {
  async createAgentTest(data: InsertAgentTestSession): Promise<AgentTestSession> {
    const [row] = await db.insert(agentTestSessions).values(data).returning();
    return row;
  },

  async getAgentTestByTestId(testId: string): Promise<AgentTestSession | null> {
    const [row] = await db.select().from(agentTestSessions).where(eq(agentTestSessions.testId, testId)).limit(1);
    return row ?? null;
  },

  async updateAgentTest(testId: string, data: Partial<Omit<InsertAgentTestSession, "testId">>): Promise<AgentTestSession | null> {
    const [row] = await db.update(agentTestSessions).set(data).where(eq(agentTestSessions.testId, testId)).returning();
    return row ?? null;
  },

  async insertFieldEvents(events: InsertAgentTestFieldEvent[]): Promise<number> {
    if (events.length === 0) return 0;
    const rows = await db.insert(agentTestFieldEvents).values(events).returning();
    return rows.length;
  },

  async getFieldEventsByTestId(testId: string): Promise<AgentTestFieldEvent[]> {
    return db.select().from(agentTestFieldEvents)
      .where(eq(agentTestFieldEvents.testId, testId))
      .orderBy(agentTestFieldEvents.sequenceNum);
  },

  async getFieldEventCountByTestId(testId: string): Promise<number> {
    const rows = await db.select().from(agentTestFieldEvents).where(eq(agentTestFieldEvents.testId, testId));
    return rows.length;
  },

  async getAgentTestsByCardId(cardId: string): Promise<AgentTestSession[]> {
    return db.select().from(agentTestSessions)
      .where(eq(agentTestSessions.cardId, cardId))
      .orderBy(desc(agentTestSessions.createdAt));
  },

  async getAgentTestsByOwnerUid(ownerUid: string): Promise<AgentTestSession[]> {
    return db.select().from(agentTestSessions)
      .where(eq(agentTestSessions.ownerUid, ownerUid))
      .orderBy(desc(agentTestSessions.createdAt));
  },

  async getAgentTestByCardIdAndStatus(cardId: string, status: string): Promise<AgentTestSession | null> {
    const [row] = await db.select().from(agentTestSessions)
      .where(and(eq(agentTestSessions.cardId, cardId), eq(agentTestSessions.status, status)))
      .limit(1);
    return row ?? null;
  },

  async getAgentTestByOwnerToken(ownerToken: string): Promise<AgentTestSession | null> {
    const [row] = await db.select().from(agentTestSessions)
      .where(eq(agentTestSessions.ownerToken, ownerToken))
      .limit(1);
    return row ?? null;
  },

  async getEventsSince(testId: string, sinceSeqNum: number): Promise<AgentTestFieldEvent[]> {
    return db.select().from(agentTestFieldEvents)
      .where(and(
        eq(agentTestFieldEvents.testId, testId),
        gt(agentTestFieldEvents.sequenceNum, sinceSeqNum),
      ))
      .orderBy(agentTestFieldEvents.sequenceNum);
  },

  async getEventLogByTestId(testId: string): Promise<AgentTestFieldEvent[]> {
    return db.select().from(agentTestFieldEvents)
      .where(eq(agentTestFieldEvents.testId, testId))
      .orderBy(agentTestFieldEvents.sequenceNum);
  },
};
