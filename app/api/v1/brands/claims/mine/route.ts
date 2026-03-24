import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";

export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const claims = await storage.getClaimsByUser(user.uid);

    const enrichedClaims = await Promise.all(
      claims.map(async (claim) => {
        const brand = await storage.getBrandBySlug(claim.brandSlug);
        return {
          id: claim.id,
          brand_slug: claim.brandSlug,
          brand_name: brand?.name ?? claim.brandSlug,
          brand_domain: brand?.domain ?? null,
          claimer_email: claim.claimerEmail,
          claim_type: claim.claimType,
          status: claim.status,
          rejection_reason: claim.rejectionReason,
          verified_at: claim.verifiedAt,
          revoked_at: claim.revokedAt,
          created_at: claim.createdAt,
        };
      })
    );

    return NextResponse.json({ claims: enrichedClaims });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "fetch_failed", message }, { status: 500 });
  }
}
