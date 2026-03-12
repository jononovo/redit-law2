import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { createCrossmintWalletSchema } from "@/shared/schema";
import { createSmartWallet } from "@/lib/rail2/wallet/create";
import { fireRailsUpdated } from "@/lib/webhooks";

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createCrossmintWalletSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const { bot_id } = parsed.data;

    const bot = await storage.getBotByBotId(bot_id);
    if (!bot || bot.ownerUid !== user.uid) {
      return NextResponse.json({ error: "Bot not found or not owned by you" }, { status: 404 });
    }

    const existingWallet = await storage.crossmintGetWalletByBotId(bot_id);
    if (existingWallet) {
      return NextResponse.json({ error: "Bot already has a Card Wallet" }, { status: 409 });
    }

    const { walletId, address } = await createSmartWallet(user.uid);

    const wallet = await storage.crossmintCreateWallet({
      botId: bot_id,
      ownerUid: user.uid,
      crossmintWalletId: walletId,
      address,
    });

    await storage.crossmintUpsertGuardrails(wallet.id, {});

    fireRailsUpdated(bot, "wallet_created", "rail2", { wallet_id: wallet.id }).catch(() => {});

    return NextResponse.json({
      wallet_id: wallet.id,
      address: wallet.address,
      bot_id: wallet.botId,
      status: wallet.status,
      chain: wallet.chain,
    });
  } catch (error) {
    console.error("POST /api/v1/card-wallet/create error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
