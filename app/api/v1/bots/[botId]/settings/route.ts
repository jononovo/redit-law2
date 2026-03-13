import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { adminAuth } from "@/lib/firebase/admin";
import { storage } from "@/server/storage";
import { z } from "zod";

async function getAuthUser(request: NextRequest) {
  const sessionUser = await getCurrentUser();
  if (sessionUser) return sessionUser;

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.slice(7);
      const decoded = await adminAuth.verifyIdToken(token);
      const fbUser = await adminAuth.getUser(decoded.uid);
      return { uid: fbUser.uid, email: fbUser.email || null, displayName: fbUser.displayName || null, photoURL: fbUser.photoURL || null };
    } catch {
      return null;
    }
  }
  return null;
}

const updateBotSettingsSchema = z.object({
  callback_url: z.string().url("Must be a valid URL").optional(),
  bot_name: z.string().min(1, "Bot name is required").max(100, "Bot name must be 100 characters or less").optional(),
  description: z.string().max(2000, "Description must be 2000 characters or less").optional().nullable(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ botId: string }> }) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { botId } = await params;

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "invalid_json", message: "Request body must be valid JSON." },
        { status: 400 }
      );
    }

    const parsed = updateBotSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation_error", message: parsed.error.issues[0]?.message || "Invalid request body." },
        { status: 400 }
      );
    }

    try {
      const { bot, newWebhookSecret } = await storage.updateBotProfile(botId, user.uid, {
        callbackUrl: parsed.data.callback_url,
        botName: parsed.data.bot_name,
        ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      });

      const response: Record<string, unknown> = {
        bot_id: bot.botId,
        bot_name: bot.botName,
        description: bot.description,
        callback_url: bot.callbackUrl,
        webhook_status: bot.webhookStatus,
      };

      if (newWebhookSecret) {
        response.webhook_secret = newWebhookSecret;
        response.webhook_warning = "Save this webhook secret now — it will not be shown again.";
      }

      return NextResponse.json(response);
    } catch (error: any) {
      if (error?.message === "BOT_NOT_FOUND") {
        return NextResponse.json({ error: "Bot not found or not owned by you" }, { status: 404 });
      }
      throw error;
    }
  } catch (error) {
    console.error("Update bot settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
