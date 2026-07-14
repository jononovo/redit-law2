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

// Diagnostic logging for the prod passkey-enrollment issue: log what Crossmint
// actually returned (status + whether the verificationConfig needed to mount
// the browser verification component is present) without leaking the config.
function logEnrollmentShape(source: string, paymentMethodId: string, enrollment: unknown) {
  const e = enrollment as { status?: string; verificationConfig?: { environment?: string } } | null;
  console.log(
    `[Rail3] enrollment ${source}`,
    JSON.stringify({
      paymentMethodId,
      status: e?.status,
      hasVerificationConfig: Boolean(e?.verificationConfig),
      environment: e?.verificationConfig?.environment,
    })
  );
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
    logEnrollmentShape("GET", paymentMethodId, enrollment);
    return NextResponse.json({ payment_method_id: paymentMethodId, enrollment });
  } catch (err) {
    const status = err instanceof CrossmintApiError ? err.status : 500;
    const message = err instanceof Error ? err.message : "get_enrollment_failed";
    console.error("[Rail3] get enrollment failed:", paymentMethodId, message);
    return NextResponse.json({ error: "get_enrollment_failed", message }, { status });
  }
}

// Ensure an agentic-enrollment exists for this payment method and return it.
// Idempotent: if Crossmint already has one (active or pending), return that
// instead of trying to create a duplicate (which 400s). Only creates when
// Crossmint reports no enrollment yet.
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
    let enrollment = await getEnrollment({ jwt: jwt!, paymentMethodId });
    logEnrollmentShape("POST pre-check", paymentMethodId, enrollment);
    if (enrollment.status === "not_started") {
      enrollment = await createEnrollment({ jwt: jwt!, paymentMethodId, email });
      logEnrollmentShape("POST created", paymentMethodId, enrollment);
    }
    return NextResponse.json({ payment_method_id: paymentMethodId, enrollment });
  } catch (err) {
    const status = err instanceof CrossmintApiError ? err.status : 500;
    const message = err instanceof Error ? err.message : "ensure_enrollment_failed";
    console.error("[Rail3] ensure enrollment failed:", message);
    return NextResponse.json({ error: "ensure_enrollment_failed", message }, { status });
  }
}
