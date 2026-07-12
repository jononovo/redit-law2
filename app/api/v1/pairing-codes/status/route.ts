import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/features/platform-management/auth/session";
import { storage } from "@/server/storage";
import { normalizePairingCode } from "@/features/platform-management/agent-management/pairing-code-format";
import { checkPairingCodeRateLimit } from "@/features/platform-management/agent-management/pairing-code-rate-limit";

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkPairingCodeRateLimit("status", ip, 2000, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const rawCode = searchParams.get("code");
    if (!rawCode) {
      return NextResponse.json({ error: "code query parameter is required" }, { status: 400 });
    }
    const code = normalizePairingCode(rawCode);

    const pairingCode = await storage.getPairingCodeByCode(code);
    if (!pairingCode) {
      return NextResponse.json({ error: "Pairing code not found" }, { status: 404 });
    }

    if (pairingCode.ownerUid) {
      const user = await getCurrentUser();
      if (!user || pairingCode.ownerUid !== user.uid) {
        return NextResponse.json({ error: "Pairing code not found" }, { status: 404 });
      }
    }

    if (pairingCode.status === "claimed" && pairingCode.botId) {
      const bot = await storage.getBotByBotId(pairingCode.botId);
      return NextResponse.json({
        status: "claimed",
        bot_id: pairingCode.botId,
        bot_name: bot?.botName || null,
      });
    }

    if (pairingCode.status === "registered" && pairingCode.botId) {
      const bot = await storage.getBotByBotId(pairingCode.botId);
      return NextResponse.json({
        status: "registered",
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
