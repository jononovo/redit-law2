import { NextResponse } from "next/server";
import { withBotApi } from "@/lib/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";

export const DELETE = withBotApi("/api/v1/bot/credentials/[id]", async (request, { bot }) => {
  const credentialId = request.nextUrl.pathname.split("/").pop();
  const credential = await storage.getBotCredentialById(credentialId!);
  if (!credential || credential.botId !== bot.botId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  await storage.deleteBotCredential(credentialId!);
  return NextResponse.json({ deleted: true });
});
