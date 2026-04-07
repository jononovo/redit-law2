import { NextResponse } from "next/server";
import { withBotApi } from "@/lib/platform-management/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";
import { z } from "zod";

const botProfileUpdateSchema = z.object({
  bot_name: z.string().min(1, "Bot name is required").max(100, "Bot name must be 100 characters or less").optional(),
  description: z.string().max(2000, "Description must be 2000 characters or less").optional().nullable(),
  callback_url: z.string().url("Must be a valid URL").optional(),
});

export const GET = withBotApi("/api/v1/bot/profile", async (_request, { bot }) => {
  return NextResponse.json({
    bot_name: bot.botName,
    description: bot.description,
    callback_url: bot.callbackUrl,
    webhook_status: bot.webhookStatus,
    webhook_fail_count: bot.webhookFailCount,
    default_rail: bot.defaultRail,
    created_at: bot.createdAt?.toISOString() || null,
    claimed_at: bot.claimedAt?.toISOString() || null,
  });
});

export const PATCH = withBotApi("/api/v1/bot/profile", async (request, { bot }) => {
  if (!bot.ownerUid) {
    return NextResponse.json({ error: "Bot not claimed" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const parsed = botProfileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", message: parsed.error.issues[0]?.message || "Invalid request body." },
      { status: 400 }
    );
  }

  try {
    const { bot: updated, newWebhookSecret } = await storage.updateBotProfile(bot.botId, bot.ownerUid, {
      callbackUrl: parsed.data.callback_url,
      botName: parsed.data.bot_name,
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
    });

    const response: Record<string, unknown> = {
      bot_name: updated.botName,
      description: updated.description,
      callback_url: updated.callbackUrl,
      webhook_status: updated.webhookStatus,
      webhook_fail_count: updated.webhookFailCount,
      default_rail: updated.defaultRail,
      created_at: updated.createdAt?.toISOString() || null,
      claimed_at: updated.claimedAt?.toISOString() || null,
    };

    if (newWebhookSecret) {
      response.webhook_secret = newWebhookSecret;
      response.webhook_warning = "Save this webhook secret now — it will not be shown again.";
    }

    return NextResponse.json(response);
  } catch (error: any) {
    if (error?.message === "BOT_NOT_FOUND") {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }
    throw error;
  }
});
