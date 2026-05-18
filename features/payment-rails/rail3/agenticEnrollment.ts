import "server-only";
import { crossmintCardsFetch, unwrapCrossmint, CrossmintApiError } from "./client";

export interface VerificationConfig {
  environment: string;
  publicApiKey: string;
}

export type AgenticEnrollment =
  | { status: "not_started" }
  | { enrollmentId: string; status: "active" }
  | { enrollmentId: string; status: "pending"; verificationConfig: VerificationConfig };

/**
 * Get the agentic-enrollment for a payment method.
 * 404 → `{ status: "not_started" }` so callers don't have to special-case it.
 */
export async function getEnrollment(params: {
  userLocator: string;
  paymentMethodId: string;
}): Promise<AgenticEnrollment> {
  const res = await crossmintCardsFetch(
    `/payment-methods/${params.paymentMethodId}/agentic-enrollment`,
    { userLocator: params.userLocator },
  );
  if (res.status === 404) return { status: "not_started" };
  return unwrapCrossmint<AgenticEnrollment>(res, "getEnrollment");
}

/**
 * Start an agentic-enrollment ceremony.
 * Returns a pending enrollment whose `verificationConfig` is consumed by the
 * `<PaymentMethodAgenticEnrollmentVerification>` SDK component in the browser.
 */
export async function createEnrollment(params: {
  userLocator: string;
  paymentMethodId: string;
  email: string;
}): Promise<AgenticEnrollment> {
  const res = await crossmintCardsFetch(
    `/payment-methods/${params.paymentMethodId}/agentic-enrollment`,
    {
      method: "POST",
      userLocator: params.userLocator,
      body: { email: params.email },
    },
  );
  return unwrapCrossmint<AgenticEnrollment>(res, "createEnrollment");
}

export { CrossmintApiError };
