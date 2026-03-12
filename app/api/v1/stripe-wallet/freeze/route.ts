import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { fireRailsUpdated } from "@/lib/webhooks";

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { wallet_id, frozen } = body;

    if (!wallet_id || typeof frozen !== "boolean") {
      return NextResponse.json({ error: "wallet_id and frozen are required" }, { status: 400 });
    }

    const newStatus = frozen ? "paused" : "active";
    const updated = await storage.privyUpdateWalletStatus(Number(wallet_id), newStatus, user.uid);

    if (!updated) {
      return NextResponse.json({ error: "Wallet not found or not owned by you" }, { status: 404 });
    }

    if (updated.botId) {
      const bot = await storage.getBotByBotId(updated.botId);
      if (bot) {
        const action = frozen ? "wallet_frozen" as const : "wallet_unfrozen" as const;
        fireRailsUpdated(bot, action, "rail1", { wallet_id: updated.id }).catch(() => {});
      }
    }

    return NextResponse.json({
      wallet_id: updated.id,
      status: updated.status,
      message: frozen ? "Wallet paused" : "Wallet activated",
    });
  } catch (error) {
    console.error("POST /api/v1/stripe-wallet/freeze error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
