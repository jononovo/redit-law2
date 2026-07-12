import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/features/platform-management/auth/session";
import { storage } from "@/server/storage";
import { fireWebhook } from "@/features/agent-interaction/webhooks";
import { notifyWalletActivated } from "@/features/platform-management/notifications";
import { normalizePairingCode } from "@/features/platform-management/agent-management/pairing-code-format";
import { checkPairingCodeRateLimit } from "@/features/platform-management/agent-management/pairing-code-rate-limit";

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in first." },
        { status: 401 }
      );
    }

    if (!checkPairingCodeRateLimit("claim", user.uid, 10, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }

    const rawCode = typeof body?.code === "string" ? body.code : "";
    const code = normalizePairingCode(rawCode);
    if (!code) {
      return NextResponse.json({ error: "Please provide a valid pairing code." }, { status: 400 });
    }

    const pairingCode = await storage.getPairingCodeByCode(code);
    if (!pairingCode) {
      return NextResponse.json({ error: "Pairing code not found." }, { status: 404 });
    }

    if (pairingCode.ownerUid && pairingCode.ownerUid !== user.uid) {
      return NextResponse.json({ error: "Pairing code not found." }, { status: 404 });
    }

    if (pairingCode.status === "claimed") {
      return NextResponse.json(
        { error: "This pairing code has already been used." },
        { status: 409 }
      );
    }

    if (pairingCode.status === "registered") {
      const bot = await storage.claimRegisteredPairingCode(code, user.uid);
      if (!bot) {
        return NextResponse.json(
          { error: "This pairing code has already been used." },
          { status: 409 }
        );
      }

      fireWebhook(bot, "wallet.activated", {
        owner_uid: user.uid,
        wallet_status: "active",
        message: "Owner claimed bot via pairing code and wallet is now live.",
      }).catch((err) => console.error("Webhook fire failed:", err));

      notifyWalletActivated(user.uid, bot.botName, bot.botId).catch(() => {});

      return NextResponse.json({
        status: "claimed",
        bot_id: bot.botId,
        bot_name: bot.botName,
        message: "Bot linked successfully.",
      });
    }

    if (pairingCode.expiresAt < new Date()) {
      return NextResponse.json({ error: "This pairing code has expired." }, { status: 410 });
    }

    if (pairingCode.ownerUid === user.uid) {
      return NextResponse.json({ status: "adopted", message: "Code is linked to your account. Your agent will connect automatically when it registers." });
    }

    const adopted = await storage.adoptPairingCode(code, user.uid);
    if (!adopted) {
      return NextResponse.json(
        { error: "This pairing code is no longer available." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      status: "adopted",
      message: "Code is linked to your account. Your agent will connect automatically when it registers.",
    });
  } catch (error) {
    console.error("Pairing code claim error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
