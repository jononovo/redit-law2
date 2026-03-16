import { NextResponse } from "next/server";
import { withBotApi } from "@/lib/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";
import { z } from "zod";
import { randomBytes } from "crypto";

const saveCredentialSchema = z.object({
  merchant_domain: z.string().min(1).max(255),
  merchant_name: z.string().min(1).max(255),
  username: z.string().min(1).max(500),
  encrypted_password: z.string().min(1),
  encrypted_totp_secret: z.string().optional().nullable(),
  login_url: z.string().max(2000).optional(),
  has_totp: z.boolean().optional().default(false),
  notes: z.string().max(2000).optional(),
});

export const GET = withBotApi("/api/v1/bot/credentials", async (_request, { bot }) => {
  const credentials = await storage.getBotCredentialsByBotId(bot.botId);
  return NextResponse.json({
    credentials: credentials.map(c => ({
      credential_id: c.credentialId,
      merchant_domain: c.merchantDomain,
      merchant_name: c.merchantName,
      username: c.username,
      has_totp: c.hasTotp,
      login_url: c.loginUrl,
      login_count: c.loginCount,
      last_login_at: c.lastLoginAt,
      last_login_status: c.lastLoginStatus,
      notes: c.notes,
      created_at: c.createdAt,
    })),
  });
});

export const POST = withBotApi("/api/v1/bot/credentials", async (request, { bot }) => {
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const parsed = saveCredentialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error", details: parsed.error.issues }, { status: 400 });
  }

  const credentialId = `cred_${randomBytes(12).toString("hex")}`;

  // Check for existing credential for this domain
  const existing = await storage.getBotCredentialByDomain(bot.botId, parsed.data.merchant_domain);
  if (existing) {
    // Update existing
    await storage.updateBotCredential(existing.credentialId, {
      merchantName: parsed.data.merchant_name,
      username: parsed.data.username,
      encryptedPassword: parsed.data.encrypted_password,
      encryptedTotpSecret: parsed.data.encrypted_totp_secret || null,
      loginUrl: parsed.data.login_url || null,
      hasTotp: parsed.data.has_totp || false,
      notes: parsed.data.notes || null,
    });
    return NextResponse.json({
      credential_id: existing.credentialId,
      merchant_domain: parsed.data.merchant_domain,
      updated: true,
    });
  }

  const credential = await storage.createBotCredential({
    credentialId,
    botId: bot.botId,
    merchantDomain: parsed.data.merchant_domain,
    merchantName: parsed.data.merchant_name,
    username: parsed.data.username,
    encryptedPassword: parsed.data.encrypted_password,
    encryptedTotpSecret: parsed.data.encrypted_totp_secret || null,
    loginUrl: parsed.data.login_url || null,
    hasTotp: parsed.data.has_totp || false,
    notes: parsed.data.notes || null,
  });

  return NextResponse.json({
    credential_id: credential.credentialId,
    merchant_domain: credential.merchantDomain,
    created: true,
  }, { status: 201 });
});
