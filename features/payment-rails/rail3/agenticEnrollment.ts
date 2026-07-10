import "server-only";
import {
  RAIL3_CROSSMINT_HOST as CROSSMINT_HOST,
  RAIL3_CROSSMINT_CLIENT_API_KEY as CROSSMINT_CLIENT_API_KEY,
  RAIL3_CROSSMINT_CLIENT_ORIGIN,
} from "@/features/payment-rails/crossmint-env";
import { unwrapCrossmint, CrossmintApiError } from "./client";

export interface VerificationConfig {
  environment: string;
  publicApiKey: string;
}

export type AgenticEnrollment =
  | { status: "not_started" }
  | { enrollmentId: string; status: "active" }
  | { enrollmentId: string; status: "pending"; verificationConfig: VerificationConfig };

// Agentic-enrollment endpoints are JWT-only (docs: "requires a JWT from an
// external auth provider … Crossmint Auth is not supported"). Server-key +
// userLocator auth is rejected with 403 here, so these two calls bypass the
// shared server-key helper and use the client key + the user's Firebase ID
// token directly. Every other Rail-3 endpoint still uses the server helper.
function enrollmentUrl(paymentMethodId: string): string {
  return `${CROSSMINT_HOST}/api/unstable/payment-methods/${paymentMethodId}/agentic-enrollment`;
}

function enrollmentHeaders(jwt: string): Record<string, string> {
  if (!CROSSMINT_CLIENT_API_KEY) {
    throw new Error("Crossmint client API key is missing — set the env var referenced in features/payment-rails/crossmint-env.ts");
  }
  const headers: Record<string, string> = {
    "X-API-KEY": CROSSMINT_CLIENT_API_KEY,
    "Authorization": `Bearer ${jwt}`,
    "Content-Type": "application/json",
  };
  // Prod client key is origin-locked; server-side fetch must set it explicitly.
  if (RAIL3_CROSSMINT_CLIENT_ORIGIN) headers["Origin"] = RAIL3_CROSSMINT_CLIENT_ORIGIN;
  return headers;
}

/**
 * Get the agentic-enrollment for a payment method.
 * 404 → `{ status: "not_started" }` so callers don't have to special-case it.
 */
export async function getEnrollment(params: {
  jwt: string;
  paymentMethodId: string;
}): Promise<AgenticEnrollment> {
  const res = await fetch(enrollmentUrl(params.paymentMethodId), {
    method: "GET",
    headers: enrollmentHeaders(params.jwt),
  });
  if (res.status === 404) return { status: "not_started" };
  return unwrapCrossmint<AgenticEnrollment>(res, "getEnrollment");
}

/**
 * Start an agentic-enrollment ceremony.
 * Returns a pending enrollment whose `verificationConfig` is consumed by the
 * `<PaymentMethodAgenticEnrollmentVerification>` SDK component in the browser.
 */
export async function createEnrollment(params: {
  jwt: string;
  paymentMethodId: string;
  email: string;
}): Promise<AgenticEnrollment> {
  const res = await fetch(enrollmentUrl(params.paymentMethodId), {
    method: "POST",
    headers: enrollmentHeaders(params.jwt),
    body: JSON.stringify({ email: params.email }),
  });
  return unwrapCrossmint<AgenticEnrollment>(res, "createEnrollment");
}

export { CrossmintApiError };
