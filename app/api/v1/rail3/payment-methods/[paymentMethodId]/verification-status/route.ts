import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/features/platform-management/auth/session";
import { storage } from "@/server/storage";
import { getVerificationStatus } from "@/features/payment-rails/rail3";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentMethodId: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { paymentMethodId } = await params;
  const pm = await storage.getRail3PaymentMethodById(paymentMethodId);
  if (!pm) return NextResponse.json({ error: "payment_method_not_found" }, { status: 404 });
  if (pm.ownerUid !== user.uid) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const liveStatus = await getVerificationStatus(paymentMethodId);
  if (liveStatus !== pm.verificationStatus) {
    await storage.updateRail3PaymentMethod(paymentMethodId, { verificationStatus: liveStatus });
  }

  return NextResponse.json({
    payment_method_id: paymentMethodId,
    verification_status: liveStatus,
  });
}
