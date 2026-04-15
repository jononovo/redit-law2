import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/features/platform-management/auth/session";
import { storage } from "@/server/storage";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const bots = await storage.getBotsByOwnerUid(user.uid);
    const botIds = bots.map((b) => b.botId);

    const failedCount = await storage.getFailedWebhookCount24h(botIds);

    return NextResponse.json({
      failed_24h: failedCount,
      status: failedCount === 0 ? "healthy" : "degraded",
      checked_bots: botIds.length,
    });
  } catch (error) {
    console.error("Webhook health check error:", error);
    return NextResponse.json({ error: "Failed to check webhook health" }, { status: 500 });
  }
}
