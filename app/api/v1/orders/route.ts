import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const params = request.nextUrl.searchParams;
    const rail = params.get("rail") || undefined;
    const botId = params.get("bot_id") || undefined;
    const walletId = params.get("wallet_id") ? Number(params.get("wallet_id")) : undefined;
    const cardId = params.get("card_id") || undefined;
    const status = params.get("status") || undefined;
    const dateFrom = params.get("date_from") ? new Date(params.get("date_from")!) : undefined;
    const dateTo = params.get("date_to") ? new Date(params.get("date_to")!) : undefined;

    const orders = await storage.getOrdersByOwner(user.uid, {
      rail,
      botId,
      walletId,
      cardId,
      status,
      dateFrom,
      dateTo,
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("GET /api/v1/orders error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
