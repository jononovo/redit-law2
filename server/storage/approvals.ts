import { db } from "@/server/db";
import {
  unifiedApprovals,
  type UnifiedApproval, type InsertUnifiedApproval,
} from "@/shared/schema";
import { eq, and, desc } from "drizzle-orm";
import type { IStorage } from "./types";

type ApprovalMethods = Pick<IStorage,
  | "createUnifiedApproval" | "getUnifiedApprovalById" | "getUnifiedApprovalByRailRef"
  | "decideUnifiedApproval" | "closeUnifiedApprovalByRailRef" | "getUnifiedApprovalsByOwnerUid"
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
};
