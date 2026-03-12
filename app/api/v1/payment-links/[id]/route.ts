import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const link = await storage.getPaymentLinkByPaymentLinkId(id);
  if (!link) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const bot = await storage.getBotByBotId(link.botId);

  return NextResponse.json({
    payment_link_id: link.paymentLinkId,
    amount_usd: link.amountCents / 100,
    description: link.description,
    bot_name: bot?.botName || link.botId,
    status: link.status === "pending" && link.expiresAt < new Date() ? "expired" : link.status,
    paid_at: link.paidAt?.toISOString() || null,
  });
}
