import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/features/platform-management/auth/session";
import { storage } from "@/server/storage";
import {
  getEnrollment,
  createEnrollment,
  CrossmintApiError,
} from "@/features/payment-rails/rail3";

// Crossmint's agentic-enrollment endpoints are JWT-only — they reject the
// server-key + userLocator path. Forward the caller's Firebase ID token
// (which authFetch already sets as `Authorization: Bearer …`) directly to
// Crossmint. The httpOnly session cookie is a Firebase *session cookie*, not
// an ID token, so it can't be forwarded — Bearer is required here.
function extractBearerJwt(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

async function loadOwnerPm(request: NextRequest, paymentMethodId: string) {
  const user = await getSessionUser(request);
  if (!user) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  const jwt = extractBearerJwt(request);
  if (!jwt) {
    return {
      error: NextResponse.json(
        { error: "bearer_required", message: "Firebase ID token required in Authorization header for agentic enrollment." },
        { status: 401 }
      ),
    };
  }
  const pm = await storage.getRail3PaymentMethodById(paymentMethodId);
  if (!pm) return { error: NextResponse.json({ error: "payment_method_not_found" }, { status: 404 }) };
  if (pm.ownerUid !== user.uid) return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  return { user, jwt, pm };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentMethodId: string }> }
) {
  const { paymentMethodId } = await params;
  const { jwt, error } = await loadOwnerPm(request, paymentMethodId);
  if (error) return error;

  try {
    const enrollment = await getEnrollment({ jwt: jwt!, paymentMethodId });
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
  const { user, jwt, error } = await loadOwnerPm(request, paymentMethodId);
  if (error) return error;

  const email = user!.email;
  if (!email) {
    return NextResponse.json(
      { error: "email_required", message: "Owner must have an email to start agentic enrollment." },
      { status: 400 }
    );
  }

  try {
    const enrollment = await createEnrollment({ jwt: jwt!, paymentMethodId, email });
    return NextResponse.json({ payment_method_id: paymentMethodId, enrollment });
  } catch (err) {
    const status = err instanceof CrossmintApiError ? err.status : 500;
    const message = err instanceof Error ? err.message : "create_enrollment_failed";
    console.error("[Rail3] createEnrollment failed:", message);
    return NextResponse.json({ error: "create_enrollment_failed", message }, { status });
  }
}
