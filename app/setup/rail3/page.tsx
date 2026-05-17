"use client";

// First-time wizard: save a real card with Crossmint and wait for verification.
// Used by both new users (entering Virtual Cards with no PMs) and existing users
// clicking "Add real card" to register a second card. After verification the
// user is sent back to /virtual-cards where they can create virtual cards on it.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/platform-management/auth/auth-context";
import { authFetch } from "@/features/platform-management/auth-fetch";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, CreditCard, ShieldCheck } from "lucide-react";

type Step = 1 | 2;

interface SavedPm {
  paymentMethodId: string;
  cardBrand?: string;
  cardLast4?: string;
}

export default function Rail3SetupPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [savedPm, setSavedPm] = useState<SavedPm | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // Crossmint iframe postMessage listener
  useEffect(() => {
    if (step !== 1) return;
    const trustedOrigins = new Set(["https://www.crossmint.com", "https://staging.crossmint.com"]);
    function handler(ev: MessageEvent) {
      if (!trustedOrigins.has(ev.origin)) return;
      const data = ev.data;
      if (typeof data !== "object" || !data) return;
      if (data.type === "crossmint:paymentMethodSelected" && data.paymentMethodId && data.agentId) {
        savePaymentMethod(data);
      }
    }
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [step]);

  async function savePaymentMethod(data: any) {
    setError(null);
    try {
      const res = await authFetch("/api/v1/rail3/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_method_id: data.paymentMethodId,
          agent_id: data.agentId,
          card_brand: data.brand,
          card_last4: data.last4,
          exp_month: data.expMonth,
          exp_year: data.expYear,
          cardholder_name: data.cardholderName,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "save_failed");
      const pm = { paymentMethodId: json.payment_method_id, cardBrand: data.brand, cardLast4: data.last4 };
      setSavedPm(pm);
      setStep(2);
      startVerificationPoll(pm.paymentMethodId);
    } catch (e: any) {
      setError(e.message);
    }
  }

  function startVerificationPoll(paymentMethodId: string) {
    setVerifying(true);
    const poll = async () => {
      try {
        const res = await authFetch(`/api/v1/rail3/payment-methods/${paymentMethodId}/verification-status`);
        const json = await res.json();
        if (json.verification_status === "active") {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          setVerifying(false);
        } else if (json.verification_status === "failed") {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          setVerifying(false);
          setError("Verification failed. Try again or contact support.");
        }
      } catch {}
    };
    pollRef.current = setInterval(poll, 3000);
    poll();
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const clientKey = process.env.NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY;
  const iframeOrigin = process.env.NEXT_PUBLIC_CROSSMINT_ENV === "staging"
    ? "https://staging.crossmint.com"
    : "https://www.crossmint.com";
  const iframeUrl = clientKey
    ? `${iframeOrigin}/embed/save-payment-method?clientApiKey=${encodeURIComponent(clientKey)}`
    : null;

  const verified = step === 2 && !verifying && !error;

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2" data-testid="text-wizard-title">Save your real card</h1>
        <p className="text-neutral-600 mb-8">
          Crossmint vaults it once. After that you can create as many virtual cards on top as you want, each with its own spending limit and agent.
        </p>

        <StepIndicator step={step} />

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" data-testid="text-error">{error}</div>
        )}

        <div className="bg-white rounded-2xl border border-neutral-200 p-8">
          {step === 1 && (
            <div className="space-y-4">
              <StepHeader
                icon={<CreditCard className="w-5 h-5" />}
                title="Save your card"
                subtitle="US-issued Visa or Mastercard credit/debit only. Not supported: non-US, business, prepaid, Chase, Fidelity. AMEX/Ramp need Crossmint approval."
              />
              {iframeUrl ? (
                <iframe
                  src={iframeUrl}
                  className="w-full h-[500px] rounded-lg border border-neutral-200"
                  title="Save payment method"
                  data-testid="iframe-save-card"
                />
              ) : (
                <div className="p-6 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
                  Crossmint client API key not configured. Set <code className="font-mono">NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY</code>.
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <StepHeader
                icon={<ShieldCheck className="w-5 h-5" />}
                title="Verify for agentic use"
                subtitle="Crossmint is verifying your card. Check your email and complete the passkey ceremony in the popup that opened."
              />
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg" data-testid="status-verification">
                {verifying ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span className="text-sm text-blue-900">
                      Waiting for verification of {savedPm?.cardBrand?.toUpperCase()} •••• {savedPm?.cardLast4}…
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-900">Verified. This card is ready to back virtual cards.</span>
                  </>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => router.push("/virtual-cards")}
                  disabled={!verified}
                  className="flex-1"
                  data-testid="button-continue-to-cards"
                >
                  Continue to virtual cards
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const steps = ["Save", "Verify"];
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => {
        const n = (i + 1) as Step;
        const active = step === n;
        const done = step > n;
        return (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                done ? "bg-green-500 text-white" : active ? "bg-primary text-white" : "bg-neutral-200 text-neutral-500"
              }`}
              data-testid={`step-indicator-${n}`}
            >
              {done ? <CheckCircle2 className="w-4 h-4" /> : n}
            </div>
            <span className={`text-sm ${active ? "text-neutral-900 font-medium" : "text-neutral-500"}`}>{label}</span>
            {i < steps.length - 1 && <div className="flex-1 h-px bg-neutral-200" />}
          </div>
        );
      })}
    </div>
  );
}

function StepHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="pb-4 border-b border-neutral-100">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
        <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
      </div>
      <p className="text-sm text-neutral-600">{subtitle}</p>
    </div>
  );
}
