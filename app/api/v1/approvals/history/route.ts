import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/platform-management/auth/session";
import { storage } from "@/server/storage";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const params = request.nextUrl.searchParams;
    const status = params.get("status") || undefined;
    const rail = params.get("rail") || undefined;
    const botName = params.get("bot_name") || undefined;
    const dateFrom = params.get("date_from") ? new Date(params.get("date_from")!) : undefined;
    const dateTo = params.get("date_to") ? new Date(params.get("date_to")!) : undefined;

    const approvals = await storage.getApprovalHistory(user.uid, {
      status,
      rail,
      botName,
      dateFrom,
      dateTo,
    });

    return NextResponse.json({ approvals });
  } catch (error) {
    console.error("GET /api/v1/approvals/history error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
