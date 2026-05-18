import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/features/platform-management/auth/session";
import { storage } from "@/server/storage";
import { deletePaymentMethod, ownerUidToUserLocator } from "@/features/payment-rails/rail3";

// Remove a saved real card. Blocked if any virtual cards still reference it.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ paymentMethodId: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { paymentMethodId } = await params;
  const pm = await storage.getRail3PaymentMethodById(paymentMethodId);
  if (!pm) return NextResponse.json({ error: "payment_method_not_found" }, { status: 404 });
  if (pm.ownerUid !== user.uid) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const cards = await storage.getRail3CardsByPaymentMethodId(paymentMethodId);
  if (cards.length > 0) {
    return NextResponse.json(
      {
        error: "has_virtual_cards",
        message: `This card backs ${cards.length} virtual card${cards.length === 1 ? "" : "s"}. Remove those first.`,
        virtual_card_count: cards.length,
      },
      { status: 409 }
    );
  }

  await deletePaymentMethod({
    userLocator: ownerUidToUserLocator(user.uid),
    paymentMethodId,
  }).catch(() => {});
  await storage.deleteRail3PaymentMethod(paymentMethodId);

  return NextResponse.json({ ok: true });
}
