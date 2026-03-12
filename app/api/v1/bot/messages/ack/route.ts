import { NextResponse } from "next/server";
import { withBotApi } from "@/lib/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";
import { z } from "zod";

const ackSchema = z.union([
  z.object({ message_id: z.number().int().positive() }),
  z.object({ message_ids: z.array(z.number().int().positive()).min(1).max(100) }),
]);

export const POST = withBotApi("/api/v1/bot/messages/ack", async (request, { bot }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const parsed = ackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", message: "Provide { message_id: number } or { message_ids: number[] }.", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const ids = "message_ids" in parsed.data ? parsed.data.message_ids : [parsed.data.message_id];

  const results = await Promise.all(
    ids.map((id) => storage.ackMessage(id, bot.botId))
  );

  const acknowledged = ids.filter((_, i) => results[i]);
  const notFound = ids.filter((_, i) => !results[i]);

  return NextResponse.json({
    acknowledged,
    not_found: notFound,
    message: `${acknowledged.length} message(s) acknowledged.`,
  });
});
