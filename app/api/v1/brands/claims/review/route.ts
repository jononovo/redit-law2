import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/platform-management/auth/session";
import { storage } from "@/server/storage";

export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (!user.flags?.includes("admin")) {
      return NextResponse.json({ error: "forbidden", message: "Admin access required." }, { status: 403 });
    }

    const pendingClaims = await storage.getPendingClaims();

    const enriched = await Promise.all(
      pendingClaims.map(async (claim) => {
        const brand = await storage.getBrandBySlug(claim.brandSlug);
        const emailDomain = claim.claimerEmail.split("@")[1] || "";
        return {
          id: claim.id,
          brand_slug: claim.brandSlug,
          brand_name: brand?.name ?? claim.brandSlug,
          brand_domain: brand?.domain ?? null,
          claimer_uid: claim.claimerUid,
          claimer_email: claim.claimerEmail,
          email_domain: emailDomain,
          domain_matches: brand?.domain
            ? emailDomain.toLowerCase() === brand.domain.toLowerCase() ||
              emailDomain.toLowerCase().endsWith("." + brand.domain.toLowerCase()) ||
              brand.domain.toLowerCase().endsWith("." + emailDomain.toLowerCase())
            : false,
          claim_type: claim.claimType,
          status: claim.status,
          created_at: claim.createdAt,
        };
      })
    );

    return NextResponse.json({ claims: enriched, total: enriched.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "fetch_failed", message }, { status: 500 });
  }
}
