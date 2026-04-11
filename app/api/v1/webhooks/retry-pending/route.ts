import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/features/platform-management/auth/session";
import { retryPendingWebhooksForBot } from "@/features/agent-interaction/webhooks";
import { storage } from "@/server/storage";

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const bots = await storage.getBotsByOwnerUid(user.uid);
    if (bots.length === 0) {
      return NextResponse.json({ retried: 0, message: "No bots found." });
    }

    let totalRetried = 0;
    for (const bot of bots) {
      const count = await retryPendingWebhooksForBot(bot.botId);
      totalRetried += count;
    }

    return NextResponse.json({
      retried: totalRetried,
      message: totalRetried > 0 ? `Retried ${totalRetried} pending webhook(s).` : "No pending webhooks to retry.",
    });
  } catch (error) {
    console.error("Retry pending webhooks error:", error);
    return NextResponse.json({ error: "Failed to retry webhooks" }, { status: 500 });
  }
}
