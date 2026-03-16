import { NextResponse } from "next/server";
import { withBotApi } from "@/lib/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";

export const GET = withBotApi("/api/v1/bot/credentials/lookup", async (request, { bot }) => {
  const domain = request.nextUrl.searchParams.get("domain");
  if (!domain) {
    return NextResponse.json({ error: "validation_error", message: "domain parameter required" }, { status: 400 });
  }

  const credential = await storage.getBotCredentialByDomain(bot.botId, domain);
  if (!credential) {
    return NextResponse.json({ error: "not_found", message: `No credentials for ${domain}` }, { status: 404 });
  }

  return NextResponse.json({
    credential_id: credential.credentialId,
    merchant_domain: credential.merchantDomain,
    merchant_name: credential.merchantName,
    username: credential.username,
    has_totp: credential.hasTotp,
    login_url: credential.loginUrl,
    notes: credential.notes,
  });
});
