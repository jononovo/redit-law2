import { NextRequest } from "next/server";
import { storage } from "@/server/storage";
import { verifyApiKey } from "@/lib/agent-management/crypto";
import type { Bot } from "@/shared/schema";

export async function authenticateBot(request: NextRequest): Promise<Bot | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const apiKey = authHeader.slice(7);
  if (!apiKey || !apiKey.startsWith("cck_live_")) return null;

  const prefix = apiKey.substring(0, 12);
  const candidates = await storage.getBotsByApiKeyPrefix(prefix);

  for (const bot of candidates) {
    const valid = await verifyApiKey(apiKey, bot.apiKeyHash);
    if (valid) return bot;
  }

  return null;
}
