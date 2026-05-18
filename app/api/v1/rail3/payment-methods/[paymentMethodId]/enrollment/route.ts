import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/features/platform-management/auth/session";
import { storage } from "@/server/storage";
import {
  getEnrollment,
  createEnrollment,
  ownerUidToUserLocator,
  CrossmintApiError,
} from "@/features/payment-rails/rail3";

async function loadOwnerPm(request: NextRequest, paymentMethodId: string) {
  const user = await getSessionUser(request);
  if (!user) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  const pm = await storage.getRail3PaymentMethodById(paymentMethodId);
  if (!pm) return { error: NextResponse.json({ error: "payment_method_not_found" }, { status: 404 }) };
  if (pm.ownerUid !== user.uid) return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  return { user, pm };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentMethodId: string }> }
) {
  const { paymentMethodId } = await params;
  const { user, error } = await loadOwnerPm(request, paymentMethodId);
  if (error) return error;

  try {
    const enrollment = await getEnrollment({
      userLocator: ownerUidToUserLocator(user!.uid),
      paymentMethodId,
    });
    return NextResponse.json({ payment_method_id: paymentMethodId, enrollment });
  } catch (err) {
    const status = err instanceof CrossmintApiError ? err.status : 500;
    const message = err instanceof Error ? err.message : "get_enrollment_failed";
    return NextResponse.json({ error: "get_enrollment_failed", message }, { status });
  }
}

// Start an agentic-enrollment ceremony. Returns the pending enrollment whose
// `verificationConfig` the browser SDK uses to run the passkey ceremony.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ paymentMethodId: string }> }
) {
  const { paymentMethodId } = await params;
  const { user, error } = await loadOwnerPm(request, paymentMethodId);
  if (error) return error;

  const email = user!.email;
  if (!email) {
    return NextResponse.json(
      { error: "email_required", message: "Owner must have an email to start agentic enrollment." },
      { status: 400 }
    );
  }

  try {
    const enrollment = await createEnrollment({
      userLocator: ownerUidToUserLocator(user!.uid),
      paymentMethodId,
      email,
    });
    return NextResponse.json({ payment_method_id: paymentMethodId, enrollment });
  } catch (err) {
    const status = err instanceof CrossmintApiError ? err.status : 500;
    const message = err instanceof Error ? err.message : "create_enrollment_failed";
    console.error("[Rail3] createEnrollment failed:", message);
    return NextResponse.json({ error: "create_enrollment_failed", message }, { status });
  }
}
