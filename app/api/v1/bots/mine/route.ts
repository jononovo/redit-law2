import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { adminAuth } from "@/lib/firebase/admin";
import { storage } from "@/server/storage";

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

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const bots = await storage.getBotsByOwnerUid(user.uid);

    return NextResponse.json({
      bots: bots.map((bot) => ({
        bot_id: bot.botId,
        bot_name: bot.botName,
        description: bot.description,
        wallet_status: bot.walletStatus,
        default_rail: bot.defaultRail || null,
        webhook_status: bot.webhookStatus || "none",
        webhook_fail_count: bot.webhookFailCount || 0,
        created_at: bot.createdAt,
        claimed_at: bot.claimedAt,
      })),
    });
  } catch (error) {
    console.error("Get my bots error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
