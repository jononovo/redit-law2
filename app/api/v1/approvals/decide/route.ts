import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { resolveApproval } from "@/lib/approvals/service";
import "@/lib/approvals/callbacks";

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { approval_id, decision } = body;

    if (!approval_id || typeof approval_id !== "string") {
      return NextResponse.json({ error: "approval_id is required" }, { status: 400 });
    }
    if (decision !== "approve" && decision !== "reject") {
      return NextResponse.json({ error: "decision must be 'approve' or 'reject'" }, { status: 400 });
    }

    const approval = await storage.getUnifiedApprovalById(approval_id);
    if (!approval) {
      return NextResponse.json({ error: "Approval not found" }, { status: 404 });
    }

    if (approval.ownerUid !== user.uid) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const action = decision === "approve" ? "approve" : "deny";
    const result = await resolveApproval(approval.approvalId, action, approval.hmacToken);

    if (!result.success && result.error === "expired") {
      return NextResponse.json({ error: "Approval has expired" }, { status: 410 });
    }

    if (!result.success && result.error?.startsWith("already_")) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to process decision" }, { status: 500 });
    }

    if (result.callbackError) {
      return NextResponse.json({ error: "Decision recorded but fulfillment failed", details: result.callbackError }, { status: 502 });
    }

    return NextResponse.json({
      approval: {
        approval_id: approval.approvalId,
        status: decision === "approve" ? "approved" : "denied",
        decided_at: result.approval?.decidedAt,
      },
    });
  } catch (error) {
    console.error("POST /api/v1/approvals/decide error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
