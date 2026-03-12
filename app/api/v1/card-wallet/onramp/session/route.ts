import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { crossmintOnrampSessionSchema } from "@/shared/schema";
import { createOnrampOrder } from "@/lib/rail2/orders/onramp";

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = crossmintOnrampSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const { wallet_id, amount_usd } = parsed.data;

    const wallet = await storage.crossmintGetWalletById(wallet_id);
    if (!wallet || wallet.ownerUid !== user.uid) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    const result = await createOnrampOrder({
      walletAddress: wallet.address,
      ownerEmail: user.email || "",
      amountUsd: amount_usd,
    });

    return NextResponse.json({
      order_id: result.orderId,
      client_secret: result.clientSecret,
      wallet_address: wallet.address,
    });
  } catch (error) {
    console.error("POST /api/v1/card-wallet/onramp/session error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
