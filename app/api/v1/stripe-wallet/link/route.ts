import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { linkBotToEntity } from "@/lib/agent-management/bot-linking";

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { wallet_id, bot_id } = body;

    if (!wallet_id || !bot_id) {
      return NextResponse.json({ error: "wallet_id and bot_id are required" }, { status: 400 });
    }

    const result = await linkBotToEntity("rail1", Number(wallet_id), bot_id, user.uid);

    if (!result.success) {
      return NextResponse.json({ error: result.error, ...result.data }, { status: result.status || 500 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("POST /api/v1/stripe-wallet/link error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
