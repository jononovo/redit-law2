import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { adminAuth } from "@/lib/firebase/admin";
import { storage } from "@/server/storage";

const VALID_RAILS = ["card_wallet", "stripe_wallet", "shopping_wallet", "self_hosted_cards", "sub_agent_cards"];

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

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { bot_id, default_rail } = body;

    if (!bot_id) {
      return NextResponse.json({ error: "bot_id is required" }, { status: 400 });
    }

    if (default_rail !== null && !VALID_RAILS.includes(default_rail)) {
      return NextResponse.json(
        { error: `Invalid rail. Must be one of: ${VALID_RAILS.join(", ")}` },
        { status: 400 }
      );
    }

    const updated = await storage.updateBotDefaultRail(bot_id, user.uid, default_rail);
    if (!updated) {
      return NextResponse.json({ error: "Bot not found or not owned by you" }, { status: 404 });
    }

    return NextResponse.json({
      bot_id: updated.botId,
      bot_name: updated.botName,
      default_rail: updated.defaultRail || null,
    });
  } catch (error) {
    console.error("Update default rail error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
