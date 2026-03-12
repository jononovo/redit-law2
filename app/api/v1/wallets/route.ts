import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const walletsWithBots = await storage.getWalletsWithBotsByOwnerUid(user.uid);

    const cards = walletsWithBots.map((w) => ({
      id: w.id,
      botId: w.botId,
      botName: w.botName,
      balanceCents: w.balanceCents,
      currency: w.currency,
      isFrozen: w.isFrozen,
      createdAt: w.createdAt,
    }));

    return NextResponse.json({ cards });
  } catch (error) {
    console.error("GET /api/v1/wallets error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
