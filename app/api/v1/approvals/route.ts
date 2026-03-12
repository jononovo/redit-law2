import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const rail = request.nextUrl.searchParams.get("rail");

    const allApprovals = await storage.getUnifiedApprovalsByOwnerUid(user.uid, "pending");

    const now = new Date();
    const approvals = allApprovals
      .filter((a) => new Date(a.expiresAt) > now)
      .filter((a) => !rail || a.rail === rail)
      .map((a) => {
        const metadata = (a.metadata as Record<string, any>) || {};
        return {
          id: a.id,
          approval_id: a.approvalId,
          rail: a.rail,
          amount_display: a.amountDisplay,
          amount_raw: a.amountRaw,
          merchant_name: a.merchantName,
          item_name: a.itemName,
          bot_name: a.botName,
          status: a.status,
          expires_at: a.expiresAt,
          created_at: a.createdAt,
          resource_url: metadata.resource_url || null,
          product_name: metadata.product_name || null,
          shipping_address: metadata.shipping_address || null,
        };
      });

    return NextResponse.json({ approvals });
  } catch (error) {
    console.error("GET /api/v1/approvals error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
