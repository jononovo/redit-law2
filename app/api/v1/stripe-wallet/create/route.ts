import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { createPrivyWalletSchema } from "@/shared/schema";
import { createServerWallet } from "@/lib/rail1/wallet/create";
import { fireRailsUpdated } from "@/lib/webhooks";

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createPrivyWalletSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const { bot_id } = parsed.data;

    const bot = await storage.getBotByBotId(bot_id);
    if (!bot || bot.ownerUid !== user.uid) {
      return NextResponse.json({ error: "Bot not found or not owned by you" }, { status: 404 });
    }

    const existingWallet = await storage.privyGetWalletByBotId(bot_id);
    if (existingWallet) {
      return NextResponse.json({ error: "Bot already has a Stripe Wallet" }, { status: 409 });
    }

    const { id: privyWalletId, address } = await createServerWallet();

    const wallet = await storage.privyCreateWallet({
      botId: bot_id,
      ownerUid: user.uid,
      privyWalletId,
      address,
    });

    await storage.privyUpsertGuardrails(wallet.id, {});

    fireRailsUpdated(bot, "wallet_created", "rail1", { wallet_id: wallet.id }).catch(() => {});

    return NextResponse.json({
      wallet_id: wallet.id,
      address: wallet.address,
      bot_id: wallet.botId,
      status: wallet.status,
    });
  } catch (error) {
    console.error("POST /api/v1/stripe-wallet/create error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
