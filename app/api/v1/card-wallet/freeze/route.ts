import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/features/platform-management/auth/session";
import { storage } from "@/server/storage";
import { fireRailsUpdated } from "@/features/agent-interaction/webhooks";

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { wallet_id, is_frozen } = body;

    if (!wallet_id || typeof is_frozen !== "boolean") {
      return NextResponse.json({ error: "wallet_id and is_frozen are required" }, { status: 400 });
    }

    const wallet = await storage.crossmintGetWalletById(Number(wallet_id));
    if (!wallet || wallet.ownerUid !== user.uid) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    const updated = await storage.crossmintUpdateWalletFrozen(wallet.id, is_frozen, user.uid);

    if (updated?.botId) {
      const bot = await storage.getBotByBotId(updated.botId);
      if (bot) {
        const action = is_frozen ? "wallet_frozen" as const : "wallet_unfrozen" as const;
        fireRailsUpdated(bot, action, "rail2", { wallet_id: updated.id }).catch(() => {});
      }
    }

    return NextResponse.json({
      wallet_id: updated?.id,
      is_frozen: updated?.isFrozen,
    });
  } catch (error) {
    console.error("POST /api/v1/card-wallet/freeze error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
