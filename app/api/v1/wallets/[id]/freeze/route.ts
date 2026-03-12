import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;
    const walletId = parseInt(id, 10);
    if (isNaN(walletId)) {
      return NextResponse.json({ error: "Invalid wallet ID" }, { status: 400 });
    }

    let body: { frozen?: boolean } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const frozen = body.frozen;
    if (typeof frozen !== "boolean") {
      return NextResponse.json({ error: "Missing 'frozen' boolean in request body" }, { status: 400 });
    }

    const updated = frozen
      ? await storage.freezeWallet(walletId, user.uid)
      : await storage.unfreezeWallet(walletId, user.uid);

    if (!updated) {
      return NextResponse.json({ error: "Wallet not found or not owned by you" }, { status: 404 });
    }

    return NextResponse.json({
      id: updated.id,
      isFrozen: updated.isFrozen,
      message: frozen ? "Wallet frozen. All spending is paused." : "Wallet unfrozen. Spending is resumed.",
    });
  } catch (error) {
    console.error("POST /api/v1/wallets/[id]/freeze error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
