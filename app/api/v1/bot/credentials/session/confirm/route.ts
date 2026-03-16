import { NextResponse } from "next/server";
import { withBotApi } from "@/lib/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";
import { z } from "zod";

const confirmSchema = z.object({
  credential_id: z.string().min(1),
  status: z.enum(["success", "failed"]),
  reason: z.string().max(500).optional(),
});

export const POST = withBotApi("/api/v1/bot/credentials/session/confirm", async (request, { bot }) => {
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error", details: parsed.error.issues }, { status: 400 });
  }

  const credential = await storage.getBotCredentialById(parsed.data.credential_id);
  if (!credential || credential.botId !== bot.botId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await storage.updateBotCredential(parsed.data.credential_id, {
    loginCount: credential.loginCount + 1,
    lastLoginAt: new Date(),
    lastLoginStatus: parsed.data.status,
  });

  return NextResponse.json({
    credential_id: parsed.data.credential_id,
    status: parsed.data.status,
    login_count: credential.loginCount + 1,
  });
});
