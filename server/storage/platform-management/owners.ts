import { db } from "@/server/db";
import {
  owners,
  type Owner, type InsertOwner,
} from "@/shared/schema";
import { eq } from "drizzle-orm";
import type { IStorage } from "../types";

type OwnerMethods = Pick<
  IStorage,
  | "getOwnerByUid"
  | "getOwnerByEmail"
  | "upsertOwner"
  | "setFirebaseRefreshToken"
  | "getFirebaseRefreshToken"
  | "clearFirebaseRefreshToken"
>;

export const ownerMethods: OwnerMethods = {
  async getOwnerByUid(uid: string): Promise<Owner | null> {
    const [row] = await db.select().from(owners).where(eq(owners.uid, uid)).limit(1);
    return row || null;
  },

  async getOwnerByEmail(email: string): Promise<Owner | null> {
    const [row] = await db.select().from(owners).where(eq(owners.email, email)).limit(1);
    return row || null;
  },

  async upsertOwner(uid: string, data: Partial<InsertOwner>): Promise<Owner> {
    const existing = await this.getOwnerByUid(uid);
    if (existing) {
      const { signupTenant: _drop, ...updateData } = data;
      const [updated] = await db
        .update(owners)
        .set({ ...updateData, updatedAt: new Date() })
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

  async setFirebaseRefreshToken(ownerUid: string, refreshToken: string): Promise<void> {
    const updated = await db
      .update(owners)
      .set({
        firebaseRefreshToken: refreshToken,
        firebaseRefreshTokenUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(owners.uid, ownerUid))
      .returning({ uid: owners.uid });
    if (updated.length === 0) {
      throw new Error(`setFirebaseRefreshToken: no owner row for uid=${ownerUid}`);
    }
  },

  async getFirebaseRefreshToken(ownerUid: string): Promise<string | null> {
    const [row] = await db
      .select({ token: owners.firebaseRefreshToken })
      .from(owners)
      .where(eq(owners.uid, ownerUid))
      .limit(1);
    return row?.token ?? null;
  },

  async clearFirebaseRefreshToken(ownerUid: string): Promise<void> {
    await db
      .update(owners)
      .set({
        firebaseRefreshToken: null,
        firebaseRefreshTokenUpdatedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(owners.uid, ownerUid));
  },
};
