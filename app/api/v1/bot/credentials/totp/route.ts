import { NextResponse } from "next/server";
import { withBotApi } from "@/lib/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";
import { z } from "zod";

const totpSchema = z.object({
  credential_id: z.string().min(1),
  encrypted_totp_secret: z.string().min(1),
});

export const POST = withBotApi("/api/v1/bot/credentials/totp", async (request, { bot }) => {
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const parsed = totpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error", details: parsed.error.issues }, { status: 400 });
  }

  const credential = await storage.getBotCredentialById(parsed.data.credential_id);
  if (!credential || credential.botId !== bot.botId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await storage.updateBotCredential(parsed.data.credential_id, {
    encryptedTotpSecret: parsed.data.encrypted_totp_secret,
    hasTotp: true,
  });

  return NextResponse.json({
    credential_id: parsed.data.credential_id,
    has_totp: true,
    updated: true,
  });
});
