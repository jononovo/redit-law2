import { db } from "@/server/db";
import {
  brandClaims, brandIndex,
  type BrandClaim, type InsertBrandClaim,
} from "@/shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import type { IStorage } from "../types";

type BrandClaimMethods = Pick<IStorage,
  | "createBrandClaim"
  | "getBrandClaimById"
  | "getActiveClaimForBrand"
  | "getPendingClaimForBrand"
  | "getClaimsByUser"
  | "getPendingClaims"
  | "verifyClaim"
  | "rejectClaim"
  | "revokeClaim"
>;

export const brandClaimMethods: BrandClaimMethods = {
  async createBrandClaim(data: InsertBrandClaim): Promise<BrandClaim> {
    const [claim] = await db.insert(brandClaims).values(data).returning();
    return claim;
  },

  async getBrandClaimById(id: number): Promise<BrandClaim | null> {
    const [claim] = await db.select().from(brandClaims).where(eq(brandClaims.id, id)).limit(1);
    return claim ?? null;
  },

  async getActiveClaimForBrand(brandSlug: string): Promise<BrandClaim | null> {
    const [claim] = await db.select().from(brandClaims)
      .where(and(eq(brandClaims.brandSlug, brandSlug), eq(brandClaims.status, "verified")))
      .limit(1);
    return claim ?? null;
  },

  async getPendingClaimForBrand(brandSlug: string, claimerUid: string): Promise<BrandClaim | null> {
    const [claim] = await db.select().from(brandClaims)
      .where(and(
        eq(brandClaims.brandSlug, brandSlug),
        eq(brandClaims.claimerUid, claimerUid),
        eq(brandClaims.status, "pending"),
      ))
      .limit(1);
    return claim ?? null;
  },

  async getClaimsByUser(claimerUid: string): Promise<BrandClaim[]> {
    return db.select().from(brandClaims)
      .where(eq(brandClaims.claimerUid, claimerUid))
      .orderBy(desc(brandClaims.createdAt));
  },

  async getPendingClaims(): Promise<BrandClaim[]> {
    return db.select().from(brandClaims)
      .where(eq(brandClaims.status, "pending"))
      .orderBy(desc(brandClaims.createdAt));
  },

  async verifyClaim(id: number, reviewedBy?: string): Promise<BrandClaim> {
    return db.transaction(async (tx) => {
      const [existing] = await tx.select().from(brandClaims)
        .where(and(
          eq(brandClaims.brandSlug, sql`(SELECT brand_slug FROM brand_claims WHERE id = ${id})`),
          eq(brandClaims.status, "verified"),
        ))
        .limit(1);

      if (existing) {
        throw new Error(`Brand already has a verified claim (claim #${existing.id}).`);
      }

      const [claim] = await tx.update(brandClaims)
        .set({
          status: "verified",
          verifiedAt: new Date(),
          reviewedBy: reviewedBy ?? null,
        })
        .where(and(eq(brandClaims.id, id), eq(brandClaims.status, "pending")))
        .returning();

      if (!claim) {
        throw new Error("Claim not found or not in pending status.");
      }

      await tx.update(brandIndex)
        .set({
          claimedBy: claim.claimerUid,
          claimId: claim.id,
          maturity: "official",
          submitterType: "brand_verified",
          updatedAt: new Date(),
        })
        .where(eq(brandIndex.slug, claim.brandSlug));

      return claim;
    });
  },

  async rejectClaim(id: number, reason: string, reviewedBy: string): Promise<BrandClaim> {
    const [claim] = await db.update(brandClaims)
      .set({
        status: "rejected",
        rejectionReason: reason,
        reviewedBy,
      })
      .where(eq(brandClaims.id, id))
      .returning();
    return claim;
  },

  async revokeClaim(id: number): Promise<BrandClaim> {
    return db.transaction(async (tx) => {
      const [claim] = await tx.update(brandClaims)
        .set({
          status: "revoked",
          revokedAt: new Date(),
        })
        .where(and(eq(brandClaims.id, id), eq(brandClaims.status, "verified")))
        .returning();

      if (!claim) {
        throw new Error("Claim not found or not in verified status.");
      }

      await tx.update(brandIndex)
        .set({
          claimedBy: null,
          claimId: null,
          maturity: "community",
          updatedAt: new Date(),
        })
        .where(and(
          eq(brandIndex.slug, claim.brandSlug),
          eq(brandIndex.claimId, claim.id),
        ));

      return claim;
    });
  },
};
