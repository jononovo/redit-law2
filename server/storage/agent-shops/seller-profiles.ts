import { db } from "@/server/db";
import { sellerProfiles } from "@/shared/schema";
import type { SellerProfile, InsertSellerProfile } from "@/shared/schema";
import type { IStorage } from "./types";
import { eq } from "drizzle-orm";

type SellerProfileMethods = Pick<IStorage,
  | "getSellerProfileByOwnerUid"
  | "getSellerProfileBySlug"
  | "upsertSellerProfile"
>;

export const sellerProfileMethods: SellerProfileMethods = {
  async getSellerProfileByOwnerUid(ownerUid: string): Promise<SellerProfile | null> {
    const [profile] = await db.select().from(sellerProfiles).where(eq(sellerProfiles.ownerUid, ownerUid)).limit(1);
    return profile || null;
  },

  async getSellerProfileBySlug(slug: string): Promise<SellerProfile | null> {
    const [profile] = await db.select().from(sellerProfiles).where(eq(sellerProfiles.slug, slug)).limit(1);
    return profile || null;
  },

  async upsertSellerProfile(ownerUid: string, data: Partial<InsertSellerProfile>): Promise<SellerProfile> {
    const existing = await db.select().from(sellerProfiles).where(eq(sellerProfiles.ownerUid, ownerUid)).limit(1);
    if (existing.length > 0) {
      const [updated] = await db.update(sellerProfiles)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(sellerProfiles.ownerUid, ownerUid))
        .returning();
      return updated;
    }
    const [created] = await db.insert(sellerProfiles)
      .values({ ownerUid, ...data })
      .returning();
    return created;
  },
};
