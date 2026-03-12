import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { sendToBot } from "@/lib/agent-management/bot-messaging";
import { z } from "zod";

const sendSchema = z.object({
  bot_id: z.string().min(1),
  event_type: z.string().min(1),
  payload: z.record(z.unknown()),
});

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { bot_id, event_type, payload } = parsed.data;

  const bot = await storage.getBotByBotId(bot_id);
  if (!bot) {
    return NextResponse.json({ error: "bot_not_found" }, { status: 404 });
  }
  if (bot.ownerUid !== user.uid) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const result = await sendToBot(bot_id, event_type, payload);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: "send_failed", message: err?.message || "Failed to send message to bot" },
      { status: 500 }
    );
  }
}
