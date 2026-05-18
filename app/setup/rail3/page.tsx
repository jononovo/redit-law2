"use client";

// First-time wizard: (1) save a real card via the Crossmint browser SDK,
// (2) start agentic-enrollment so the card can back agent purchases. On
// enrollment-active the user is sent to /virtual-cards.
//
// Crossmint agents are created lazily per-bot when the user creates their
// first virtual card — no agent step in this wizard.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/platform-management/auth/auth-context";
import { authFetch } from "@/features/platform-management/auth-fetch";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, CreditCard, ShieldCheck } from "lucide-react";
import { CrossmintPaymentMethodManagement } from "@crossmint/client-sdk-react-ui";
import { Rail3CrossmintProvider, useCrossmintJwt } from "@/components/rail3/crossmint-provider";

type Step = 1 | 2;

interface SavedPm {
  paymentMethodId: string;
  cardBrand?: string;
  cardLast4?: string;
}

export default function Rail3SetupPage() {
  return (
    <Rail3CrossmintProvider>
      <SetupInner />
    </Rail3CrossmintProvider>
  );
}

function SetupInner() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const jwt = useCrossmintJwt();

  const [step, setStep] = useState<Step>(1);
  const [savedPm, setSavedPm] = useState<SavedPm | null>(null);
  const [enrollmentStatus, setEnrollmentStatus] = useState<string | null>(null);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const startEnrollmentPoll = useCallback((paymentMethodId: string) => {
    const poll = async () => {
      try {
        const res = await authFetch(`/api/v1/rail3/payment-methods/${paymentMethodId}/enrollment`);
        const json = await res.json();
        if (!res.ok) {
          if (res.status === 404) return;
          throw new Error(json.message || json.error || "enrollment_failed");
        }
        const status = json.enrollment?.status as string | undefined;
        if (status) setEnrollmentStatus(status);
        if (status === "active" || status === "failed") {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          if (status === "failed") setEnrollmentError("Enrollment failed. Check your email or retry.");
        }
      } catch (e: any) {
        setEnrollmentError(e.message);
      }
    };
    pollRef.current = setInterval(poll, 3000);
    poll();
  }, []);

  const savePaymentMethodAndEnroll = useCallback(async (pm: {
    paymentMethodId: string;
    card: { brand: string; last4: string; expiration: { month: string; year: string } };
  }) => {
    setEnrollmentError(null);
    try {
      const saveRes = await authFetch("/api/v1/rail3/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_method_id: pm.paymentMethodId,
          card_brand: pm.card.brand?.toLowerCase(),
          card_last4: pm.card.last4,
          exp_month: Number(pm.card.expiration.month),
          exp_year: Number(pm.card.expiration.year),
        }),
      });
      const saveJson = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveJson.message || saveJson.error || "save_failed");
      const saved: SavedPm = {
        paymentMethodId: saveJson.payment_method_id,
        cardBrand: pm.card.brand,
        cardLast4: pm.card.last4,
      };
      setSavedPm(saved);
      setStep(2);

      const enrollRes = await authFetch(`/api/v1/rail3/payment-methods/${saved.paymentMethodId}/enrollment`, { method: "POST" });
      const enrollJson = await enrollRes.json();
      if (!enrollRes.ok) throw new Error(enrollJson.message || enrollJson.error || "enrollment_init_failed");
      setEnrollmentStatus(enrollJson.enrollment?.status || "pending");
      startEnrollmentPoll(saved.paymentMethodId);
    } catch (e: any) {
      setEnrollmentError(e.message);
    }
  }, [startEnrollmentPoll]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const enrolled = enrollmentStatus === "active";

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2" data-testid="text-wizard-title">Save your real card</h1>
        <p className="text-neutral-600 mb-8">
          Crossmint vaults it once. After that you can create as many virtual cards on top as you want — one per bot, each with its own spending limit.
        </p>

        <StepIndicator step={step} />

        <div className="bg-white rounded-2xl border border-neutral-200 p-8">
          {step === 1 && (
            <Section icon={<CreditCard className="w-5 h-5" />} title="Save your card" subtitle="US-issued Visa or Mastercard credit/debit only. Not supported: non-US, business, prepaid, Chase, Fidelity. AMEX/Ramp need Crossmint approval.">
              {jwt ? (
                <div data-testid="container-pm-management" className="rounded-lg border border-neutral-200 overflow-hidden">
                  <CrossmintPaymentMethodManagement
                    jwt={jwt}
                    onPaymentMethodSelected={(pm) => { savePaymentMethodAndEnroll(pm); }}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 text-sm text-neutral-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Connecting to Crossmint…
                </div>
              )}
            </Section>
          )}

          {step === 2 && (
            <Section icon={<ShieldCheck className="w-5 h-5" />} title="Authorize for agentic use" subtitle="Crossmint just emailed you a link. Open it and tap your passkey to authorize this card for agent use.">
              {enrollmentError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" data-testid="text-enrollment-error">
                  {enrollmentError}
                </div>
              )}
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg" data-testid="status-enrollment">
                {enrolled ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-900">Card authorized. Ready to back virtual cards.</span>
                  </>
                ) : (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span className="text-sm text-blue-900">
                      Waiting for passkey on {savedPm?.cardBrand?.toUpperCase()} •••• {savedPm?.cardLast4} (status: {enrollmentStatus || "pending"})
                    </span>
                  </>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => router.push("/virtual-cards")}
                  disabled={!enrolled}
                  className="flex-1"
                  data-testid="button-continue-to-cards"
                >
                  Continue to virtual cards
                </Button>
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const steps = ["Save", "Authorize"];
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

function Section({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="pb-4 border-b border-neutral-100">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
          <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
        </div>
        <p className="text-sm text-neutral-600">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
