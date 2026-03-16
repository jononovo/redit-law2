import { NextResponse } from "next/server";
import { withBotApi } from "@/lib/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";
import { z } from "zod";
import { randomBytes } from "crypto";

const sessionSchema = z.object({
  credential_id: z.string().min(1),
  purpose: z.enum(["login", "totp"]).default("login"),
});

export const POST = withBotApi("/api/v1/bot/credentials/session", async (request, { bot }) => {
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const parsed = sessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error", details: parsed.error.issues }, { status: 400 });
  }

  const credential = await storage.getBotCredentialById(parsed.data.credential_id);
  if (!credential || credential.botId !== bot.botId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Return encrypted data -- the MCP server decrypts with its local key
  const response: Record<string, any> = {
    session_id: `sess_${randomBytes(12).toString("hex")}`,
    credential_id: credential.credentialId,
    username: credential.username,
    encrypted_password: credential.encryptedPassword,
    merchant_domain: credential.merchantDomain,
  };

  if (credential.encryptedTotpSecret) {
    response.encrypted_totp_secret = credential.encryptedTotpSecret;
  }

  return NextResponse.json(response);
});
