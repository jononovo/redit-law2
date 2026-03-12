import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";

export async function GET() {
  try {
    const user = await getCurrentUser();
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
