import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const bots = await storage.getBotsByOwnerUid(user.uid);
    if (bots.length === 0) {
      return NextResponse.json({ deliveries: [] });
    }

    const botIds = bots.map((b) => b.botId);
    const botNameMap = new Map(bots.map((b) => [b.botId, b.botName]));

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    const deliveries = await storage.getWebhookDeliveriesByBotIds(botIds, limit);

    return NextResponse.json({
      deliveries: deliveries.map((d) => ({
        id: d.id,
        bot_id: d.botId,
        bot_name: botNameMap.get(d.botId) || d.botId,
        event_type: d.eventType,
        status: d.status,
        attempts: d.attempts,
        max_attempts: d.maxAttempts,
        response_status: d.responseStatus,
        response_body: d.responseBody,
        last_attempt_at: d.lastAttemptAt,
        next_retry_at: d.nextRetryAt,
        created_at: d.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get webhook deliveries error:", error);
    return NextResponse.json({ error: "Failed to get webhook deliveries" }, { status: 500 });
  }
}
