import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getPaymentMethodDetails } from "@/lib/stripe";
import { storage } from "@/server/storage";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const methods = await storage.getPaymentMethods(user.uid);

    return NextResponse.json({
      payment_methods: methods.map((pm) => ({
        id: pm.id,
        card_last4: pm.cardLast4,
        card_brand: pm.cardBrand,
        is_default: pm.isDefault,
        label: pm.label,
        created_at: pm.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get payment methods error:", error);
    return NextResponse.json({ error: "Failed to get payment methods" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { payment_method_id, customer_id } = body;

    if (!payment_method_id || !customer_id) {
      return NextResponse.json({ error: "payment_method_id and customer_id are required" }, { status: 400 });
    }

    const details = await getPaymentMethodDetails(payment_method_id);

    const pm = await storage.addPaymentMethod({
      ownerUid: user.uid,
      stripeCustomerId: customer_id,
      stripePmId: payment_method_id,
      cardLast4: details.last4,
      cardBrand: details.brand,
    });

    return NextResponse.json({
      payment_method: {
        id: pm.id,
        card_last4: pm.cardLast4,
        card_brand: pm.cardBrand,
        is_default: pm.isDefault,
      },
      message: "Payment method saved successfully",
    });
  } catch (error) {
    console.error("Save payment method error:", error);
    return NextResponse.json({ error: "Failed to save payment method" }, { status: 500 });
  }
}
