import { db } from "@/server/db";
import {
  owners,
  type Owner, type InsertOwner,
} from "@/shared/schema";
import { eq } from "drizzle-orm";
import type { IStorage } from "./types";

type OwnerMethods = Pick<IStorage, "getOwnerByUid" | "upsertOwner">;

export const ownerMethods: OwnerMethods = {
  async getOwnerByUid(uid: string): Promise<Owner | null> {
    const [row] = await db.select().from(owners).where(eq(owners.uid, uid)).limit(1);
    return row || null;
  },

  async upsertOwner(uid: string, data: Partial<InsertOwner>): Promise<Owner> {
    const existing = await this.getOwnerByUid(uid);
    if (existing) {
      const [updated] = await db
        .update(owners)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(owners.uid, uid))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(owners)
      .values({ uid, email: data.email || "", ...data })
      .returning();
    return created;
  },
};
