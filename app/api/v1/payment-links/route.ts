import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";
import { storage } from "@/server/storage";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(session, true);
    const ownerUid = decoded.uid;

    const links = await storage.getPaymentLinksByOwnerUid(ownerUid, 100);
    const now = new Date();

    const ownerBots = await storage.getBotsByOwnerUid(ownerUid);
    const botNameMap = new Map(ownerBots.map(b => [b.botId, b.botName]));

    const paymentLinks = links.map((link) => {
      const effectiveStatus = link.status === "pending" && link.expiresAt < now ? "expired" : link.status;
      return {
        id: link.id,
        payment_link_id: link.paymentLinkId,
        bot_id: link.botId,
        bot_name: botNameMap.get(link.botId) || link.botId,
        amount_usd: link.amountCents / 100,
        description: link.description,
        payer_email: link.payerEmail,
        status: effectiveStatus,
        created_at: link.createdAt.toISOString(),
        expires_at: link.expiresAt.toISOString(),
        paid_at: link.paidAt?.toISOString() || null,
      };
    });

    return NextResponse.json({ payment_links: paymentLinks });
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}
