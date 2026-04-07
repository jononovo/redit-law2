import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/platform-management/auth/session";
import { storage } from "@/server/storage";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const claimId = parseInt(id, 10);
    if (isNaN(claimId)) {
      return NextResponse.json({ error: "invalid_id" }, { status: 400 });
    }

    const claim = await storage.getBrandClaimById(claimId);
    if (!claim) {
      return NextResponse.json({ error: "not_found", message: "Claim not found." }, { status: 404 });
    }

    const isAdmin = user.flags?.includes("admin");
    if (claim.claimerUid !== user.uid && !isAdmin) {
      return NextResponse.json({ error: "forbidden", message: "You can only revoke your own claims." }, { status: 403 });
    }

    if (claim.status !== "verified") {
      return NextResponse.json(
        { error: "invalid_status", message: "Only verified claims can be revoked." },
        { status: 400 }
      );
    }

    const revoked = await storage.revokeClaim(claimId);

    return NextResponse.json({
      claim: { id: revoked.id, status: "revoked", revoked_at: revoked.revokedAt },
      message: "Claim revoked successfully. Brand maturity has been set to community.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "revoke_failed", message }, { status: 500 });
  }
}
