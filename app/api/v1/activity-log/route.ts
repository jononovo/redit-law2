import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import type { Bot } from "@/shared/schema";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const bots: Bot[] = await storage.getBotsByOwnerUid(user.uid);
  if (bots.length === 0) {
    return NextResponse.json({ logs: [] });
  }

  const botIds = bots.map((b) => b.botId);
  const logs = await storage.getAccessLogsByBotIds(botIds, 50);

  const botNameMap = new Map(bots.map((b) => [b.botId, b.botName]));

  return NextResponse.json({
    logs: logs.map((log) => ({
      id: log.id,
      bot_id: log.botId,
      bot_name: botNameMap.get(log.botId) || log.botId,
      endpoint: log.endpoint,
      method: log.method,
      status_code: log.statusCode,
      response_time_ms: log.responseTimeMs,
      error_code: log.errorCode,
      created_at: log.createdAt.toISOString(),
    })),
  });
}
