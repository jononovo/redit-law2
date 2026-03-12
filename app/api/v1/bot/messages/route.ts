import { NextResponse } from "next/server";
import { withBotApi } from "@/lib/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";

export const GET = withBotApi("/api/v1/bot/messages", async (_request, { bot }) => {
  await storage.purgeExpiredMessages();

  const messages = await storage.getPendingMessagesForBot(bot.botId);

  return NextResponse.json({
    bot_id: bot.botId,
    messages: messages.map((m) => ({
      id: m.id,
      event_type: m.eventType,
      payload: m.payload,
      staged_at: m.stagedAt,
      expires_at: m.expiresAt,
    })),
    count: messages.length,
    instructions: "Process each message based on its event_type. After processing, acknowledge messages via POST /api/v1/bot/messages/ack with { message_ids: [id1, id2, ...] } to remove them from the queue.",
  });
});
