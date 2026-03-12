import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { claimBotRequestSchema } from "@/shared/schema";
import { storage } from "@/server/storage";
import { fireWebhook } from "@/lib/webhooks";
import { notifyWalletActivated } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in first." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = claimBotRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request. Please provide a valid claim token.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { claim_token } = parsed.data;

    const bot = await storage.claimBot(claim_token, user.uid);
    if (!bot) {
      return NextResponse.json(
        { error: "Invalid or already claimed token. Check your email for the correct token." },
        { status: 404 }
      );
    }

    fireWebhook(bot, "wallet.activated", {
      owner_uid: user.uid,
      wallet_status: "active",
      message: "Owner claimed bot and wallet is now live.",
    }).catch((err) => console.error("Webhook fire failed:", err));

    notifyWalletActivated(user.uid, bot.botName, bot.botId).catch(() => {});

    return NextResponse.json({
      bot_id: bot.botId,
      bot_name: bot.botName,
      status: bot.walletStatus,
      message: "Bot claimed successfully! You can now manage it from your dashboard.",
    });
  } catch (error) {
    console.error("Claim bot error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
