import { db } from "@/server/db";
import {
  unifiedApprovals,
  type UnifiedApproval, type InsertUnifiedApproval,
} from "@/shared/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import type { IStorage } from "./types";

export interface ApprovalFilters {
  status?: string;
  rail?: string;
  botName?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

type ApprovalMethods = Pick<IStorage,
  | "createUnifiedApproval" | "getUnifiedApprovalById" | "getUnifiedApprovalByRailRef"
  | "decideUnifiedApproval" | "closeUnifiedApprovalByRailRef" | "getUnifiedApprovalsByOwnerUid"
  | "getApprovalHistory"
>;

export const approvalMethods: ApprovalMethods = {
  async createUnifiedApproval(data: InsertUnifiedApproval): Promise<UnifiedApproval> {
    const [approval] = await db.insert(unifiedApprovals).values(data).returning();
    return approval;
  },

  async getUnifiedApprovalById(approvalId: string): Promise<UnifiedApproval | null> {
    const [approval] = await db
      .select()
      .from(unifiedApprovals)
      .where(eq(unifiedApprovals.approvalId, approvalId))
      .limit(1);
    return approval || null;
  },

  async getUnifiedApprovalByRailRef(rail: string, railRef: string): Promise<UnifiedApproval | null> {
    const [approval] = await db
      .select()
      .from(unifiedApprovals)
      .where(and(
        eq(unifiedApprovals.rail, rail),
        eq(unifiedApprovals.railRef, railRef),
      ))
      .orderBy(desc(unifiedApprovals.createdAt))
      .limit(1);
    return approval || null;
  },

  async decideUnifiedApproval(approvalId: string, decision: string): Promise<UnifiedApproval | null> {
    const [updated] = await db
      .update(unifiedApprovals)
      .set({ status: decision, decidedAt: new Date() })
      .where(and(eq(unifiedApprovals.approvalId, approvalId), eq(unifiedApprovals.status, "pending")))
      .returning();
    return updated || null;
  },

  async closeUnifiedApprovalByRailRef(rail: string, railRef: string, decision: string): Promise<void> {
    await db
      .update(unifiedApprovals)
      .set({ status: decision, decidedAt: new Date() })
      .where(and(
        eq(unifiedApprovals.rail, rail),
        eq(unifiedApprovals.railRef, railRef),
        eq(unifiedApprovals.status, "pending"),
      ));
  },

  async getUnifiedApprovalsByOwnerUid(ownerUid: string, status?: string): Promise<UnifiedApproval[]> {
    const conditions = [eq(unifiedApprovals.ownerUid, ownerUid)];
    if (status) conditions.push(eq(unifiedApprovals.status, status));
    return db
      .select()
      .from(unifiedApprovals)
      .where(and(...conditions))
      .orderBy(desc(unifiedApprovals.createdAt))
      .limit(50);
  },

  async getApprovalHistory(ownerUid: string, filters?: ApprovalFilters): Promise<UnifiedApproval[]> {
    const conditions = [eq(unifiedApprovals.ownerUid, ownerUid)];

    if (filters?.status) {
      conditions.push(eq(unifiedApprovals.status, filters.status));
    }
    if (filters?.rail) {
      conditions.push(eq(unifiedApprovals.rail, filters.rail));
    }
    if (filters?.botName) {
      conditions.push(eq(unifiedApprovals.botName, filters.botName));
    }
    if (filters?.dateFrom) {
      conditions.push(gte(unifiedApprovals.createdAt, filters.dateFrom));
    }
    if (filters?.dateTo) {
      conditions.push(lte(unifiedApprovals.createdAt, filters.dateTo));
    }

    return db.select().from(unifiedApprovals)
      .where(and(...conditions))
      .orderBy(desc(unifiedApprovals.createdAt))
      .limit(200);
  },
};
