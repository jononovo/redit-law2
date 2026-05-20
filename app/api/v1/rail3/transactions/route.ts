import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/features/platform-management/auth/session";
import { storage } from "@/server/storage";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const cards = await storage.getRail3CardsByOwnerUid(user.uid);
  const cardIds = cards.map((c) => c.cardId);

  const lists = await Promise.all(cardIds.map((id) => storage.getRail3TransactionsByCardId(id, 100)));
  const flat = lists.flat().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return NextResponse.json({
    transactions: flat.map((t) => ({
      transaction_id: t.transactionId,
      card_id: t.cardId,
      bot_id: t.botId,
      merchant_name: t.merchantName,
      merchant_url: t.merchantUrl,
      amount_cents: t.amountCents,
      status: t.status,
      credential_issued_at: t.credentialIssuedAt.toISOString(),
      settled_at: t.settledAt?.toISOString() || null,
      created_at: t.createdAt.toISOString(),
    })),
  });
}
