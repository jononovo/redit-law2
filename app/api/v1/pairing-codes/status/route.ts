import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    if (!code) {
      return NextResponse.json({ error: "code query parameter is required" }, { status: 400 });
    }

    const pairingCode = await storage.getPairingCodeByCode(code);
    if (!pairingCode || pairingCode.ownerUid !== user.uid) {
      return NextResponse.json({ error: "Pairing code not found" }, { status: 404 });
    }

    if (pairingCode.status === "paired" && pairingCode.botId) {
      const bot = await storage.getBotByBotId(pairingCode.botId);
      return NextResponse.json({
        status: "paired",
        bot_id: pairingCode.botId,
        bot_name: bot?.botName || null,
      });
    }

    if (pairingCode.expiresAt < new Date() && pairingCode.status === "pending") {
      return NextResponse.json({ status: "expired" });
    }

    return NextResponse.json({ status: "pending" });
  } catch (error) {
    console.error("Pairing code status check failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
