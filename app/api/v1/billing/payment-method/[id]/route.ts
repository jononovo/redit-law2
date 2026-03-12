import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { detachPaymentMethod } from "@/lib/stripe";
import { storage } from "@/server/storage";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;
    const pmId = parseInt(id, 10);
    if (isNaN(pmId)) {
      return NextResponse.json({ error: "Invalid payment method ID" }, { status: 400 });
    }

    const pm = await storage.getPaymentMethodById(pmId, user.uid);
    if (!pm) {
      return NextResponse.json({ error: "Payment method not found" }, { status: 404 });
    }

    try {
      await detachPaymentMethod(pm.stripePmId);
    } catch {}

    await storage.deletePaymentMethodById(pmId, user.uid);

    return NextResponse.json({ message: "Payment method removed" });
  } catch (error) {
    console.error("Delete payment method error:", error);
    return NextResponse.json({ error: "Failed to remove payment method" }, { status: 500 });
  }
}

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;
    const pmId = parseInt(id, 10);
    if (isNaN(pmId)) {
      return NextResponse.json({ error: "Invalid payment method ID" }, { status: 400 });
    }

    const updated = await storage.setDefaultPaymentMethod(pmId, user.uid);
    if (!updated) {
      return NextResponse.json({ error: "Payment method not found" }, { status: 404 });
    }

    return NextResponse.json({
      payment_method: {
        id: updated.id,
        card_last4: updated.cardLast4,
        card_brand: updated.cardBrand,
        is_default: updated.isDefault,
      },
      message: "Default payment method updated",
    });
  } catch (error) {
    console.error("Set default payment method error:", error);
    return NextResponse.json({ error: "Failed to update default" }, { status: 500 });
  }
}
