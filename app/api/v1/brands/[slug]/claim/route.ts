import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/features/platform-management/auth/session";
import { storage } from "@/server/storage";
import { canAutoVerifyClaim, extractEmailDomain } from "@/features/brand-engine/brand-claims/domain";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (!user.email) {
      return NextResponse.json(
        { error: "no_email", message: "Your account must have an email address to claim a brand." },
        { status: 400 }
      );
    }

    const { slug } = await params;
    const brand = await storage.getBrandBySlug(slug);
    if (!brand) {
      return NextResponse.json(
        { error: "not_found", message: `Brand '${slug}' not found.` },
        { status: 404 }
      );
    }

    const activeClaim = await storage.getActiveClaimForBrand(slug);
    if (brand.claimedBy || activeClaim) {
      return NextResponse.json(
        { error: "already_claimed", message: "This brand has already been claimed." },
        { status: 409 }
      );
    }

    const existingPending = await storage.getPendingClaimForBrand(slug, user.uid);
    if (existingPending) {
      return NextResponse.json(
        { error: "pending_claim_exists", message: "You already have a pending claim for this brand." },
        { status: 409 }
      );
    }

    const verificationResult = canAutoVerifyClaim(user.email, brand.domain);

    if (verificationResult === "blocked") {
      return NextResponse.json(
        { error: "free_email_blocked", message: "Brand claims require a corporate email address. Free email providers (Gmail, Yahoo, etc.) are not accepted." },
        { status: 400 }
      );
    }

    if (verificationResult === "auto_verify") {
      const claim = await storage.createBrandClaim({
        brandSlug: slug,
        claimerUid: user.uid,
        claimerEmail: user.email,
        claimType: "domain_match",
        status: "pending",
      });

      const verified = await storage.verifyClaim(claim.id);

      return NextResponse.json({
        claim: { id: verified.id, status: "verified", claim_type: "domain_match" },
        brand: { slug: brand.slug, maturity: "official", claimed_by: user.uid },
        message: "Brand claimed successfully. Your email domain matches the brand domain.",
      });
    }

    const claim = await storage.createBrandClaim({
      brandSlug: slug,
      claimerUid: user.uid,
      claimerEmail: user.email,
      claimType: "manual_review",
      status: "pending",
    });

    return NextResponse.json({
      claim: { id: claim.id, status: "pending", claim_type: "manual_review" },
      message: "Claim submitted for review. Your email domain does not match the brand domain.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "claim_failed", message }, { status: 500 });
  }
}
