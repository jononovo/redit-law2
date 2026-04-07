import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/platform-management/auth/session";
import { storage } from "@/server/storage";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (!user.flags?.includes("admin")) {
      return NextResponse.json({ error: "forbidden", message: "Admin access required." }, { status: 403 });
    }

    const { id } = await params;
    const claimId = parseInt(id, 10);
    if (isNaN(claimId)) {
      return NextResponse.json({ error: "invalid_id" }, { status: 400 });
    }

    const body = await req.json();
    const action = body.action as string;
    if (!["verify", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "invalid_action", message: "Action must be 'verify' or 'reject'." },
        { status: 400 }
      );
    }

    const claim = await storage.getBrandClaimById(claimId);
    if (!claim) {
      return NextResponse.json({ error: "not_found", message: "Claim not found." }, { status: 404 });
    }
    if (claim.status !== "pending") {
      return NextResponse.json(
        { error: "invalid_status", message: `Claim is already ${claim.status}.` },
        { status: 400 }
      );
    }

    if (action === "verify") {
      const verified = await storage.verifyClaim(claimId, user.uid);
      return NextResponse.json({
        claim: { id: verified.id, status: "verified", verified_at: verified.verifiedAt },
        message: "Claim verified. Brand maturity has been upgraded to official.",
      });
    }

    const reason = body.reason as string;
    if (!reason) {
      return NextResponse.json(
        { error: "reason_required", message: "A rejection reason is required." },
        { status: 400 }
      );
    }
    const rejected = await storage.rejectClaim(claimId, reason, user.uid);
    return NextResponse.json({
      claim: { id: rejected.id, status: "rejected", rejection_reason: reason },
      message: "Claim rejected.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "review_failed", message }, { status: 500 });
  }
}
