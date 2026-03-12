import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { adminAuth } from "@/lib/firebase/admin";
import { storage } from "@/server/storage";
import { db } from "@/server/db";
import { bots, wallets } from "@/shared/schema";
import { generateBotId, generateApiKey, hashApiKey, getApiKeyPrefix, generateWebhookSecret } from "@/lib/agent-management/crypto";

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

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const { bot_name } = body;
    if (!bot_name || typeof bot_name !== "string" || bot_name.trim().length === 0) {
      return NextResponse.json({ error: "missing_bot_name", message: "A card name is required." }, { status: 400 });
    }

    const existingBots = await storage.getBotsByOwnerUid(user.uid);
    if (existingBots.length > 0) {
      return NextResponse.json({
        error: "bot_already_exists",
        message: "You already have a bot on this account. Only one bot per account is allowed.",
        existing_bot_id: existingBots[0].botId,
        existing_bot_name: existingBots[0].botName,
      }, { status: 409 });
    }

    const botId = generateBotId();
    const apiKey = generateApiKey();
    const apiKeyHash = await hashApiKey(apiKey);
    const apiKeyPrefix = getApiKeyPrefix(apiKey);
    const webhookSecret = generateWebhookSecret();

    const [bot] = await db.insert(bots).values({
      botId,
      botName: bot_name.trim(),
      description: `Self-hosted card agent: ${bot_name.trim()}`,
      ownerEmail: user.email || "",
      apiKeyHash,
      apiKeyPrefix,
      claimToken: null,
      walletStatus: "active",
      callbackUrl: null,
      webhookSecret,
      ownerUid: user.uid,
      claimedAt: new Date(),
    }).returning();

    await db.insert(wallets).values({
      botId,
      ownerUid: user.uid,
      balanceCents: 0,
    });

    return NextResponse.json({
      bot_id: botId,
      bot_name: bot.botName,
      api_key: apiKey,
    }, { status: 201 });
  } catch (error: any) {
    console.error("Rail4 create-bot error:", error?.message || error);
    return NextResponse.json({ error: "internal_error", message: "Failed to create card agent." }, { status: 500 });
  }
}
