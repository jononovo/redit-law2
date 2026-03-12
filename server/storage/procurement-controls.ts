import { db } from "@/server/db";
import {
  procurementControls,
  type ProcurementControl, type InsertProcurementControl,
} from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import type { IStorage } from "./types";

type ProcurementControlMethods = Pick<IStorage,
  "getProcurementControls" | "getProcurementControlsByScope" | "upsertProcurementControls"
>;

export const procurementControlMethods: ProcurementControlMethods = {
  async getProcurementControls(ownerUid: string): Promise<ProcurementControl[]> {
    return db.select().from(procurementControls).where(eq(procurementControls.ownerUid, ownerUid));
  },

  async getProcurementControlsByScope(ownerUid: string, scope: string, scopeRefId?: string | null): Promise<ProcurementControl | null> {
    const conditions = scopeRefId
      ? and(eq(procurementControls.ownerUid, ownerUid), eq(procurementControls.scope, scope), eq(procurementControls.scopeRefId, scopeRefId))
      : and(eq(procurementControls.ownerUid, ownerUid), eq(procurementControls.scope, scope));
    const [row] = await db.select().from(procurementControls).where(conditions).limit(1);
    return row || null;
  },

  async upsertProcurementControls(ownerUid: string, scope: string, scopeRefId: string | null, data: Partial<InsertProcurementControl>): Promise<ProcurementControl> {
    const existing = await this.getProcurementControlsByScope(ownerUid, scope, scopeRefId);
    if (existing) {
      const [updated] = await db
        .update(procurementControls)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(procurementControls.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(procurementControls)
      .values({ ownerUid, scope, scopeRefId, ...data })
      .returning();
    return created;
  },
};
