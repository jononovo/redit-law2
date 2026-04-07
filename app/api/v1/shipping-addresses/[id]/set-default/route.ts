import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/features/platform-management/auth/session";
import { storage } from "@/server/storage";
import { pushShippingFileToBots } from "@/features/agent-interaction/shipping/push-shipping-to-bots";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;
    const addressId = parseInt(id, 10);
    if (isNaN(addressId)) {
      return NextResponse.json({ error: "Invalid address ID" }, { status: 400 });
    }

    const existing = await storage.getShippingAddressesByOwner(user.uid);
    const owns = existing.find((a) => a.id === addressId);
    if (!owns) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    const address = await storage.updateShippingAddress(addressId, { isDefault: true, ownerUid: user.uid });

    pushShippingFileToBots(user.uid).catch((err) =>
      console.error("[shipping-addresses/set-default] Failed to push shipping file:", err)
    );

    return NextResponse.json({ address });
  } catch (error) {
    console.error("POST /api/v1/shipping-addresses/[id]/set-default error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
