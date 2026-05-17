"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/platform-management/auth/auth-context";
import { authFetch } from "@/features/platform-management/auth-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle2, Loader2, CreditCard, ShieldCheck, KeyRound, Link2 } from "lucide-react";

type Step = 1 | 2 | 3 | 4;

interface SavedCard {
  card_id: string;
  card_brand?: string;
  card_last4?: string;
}

interface Bot {
  bot_id: string;
  bot_name: string;
}

export default function Rail3SetupPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [savedCard, setSavedCard] = useState<SavedCard | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [permissionMode, setPermissionMode] = useState<"limited" | "open">("limited");
  const [maxAmount, setMaxAmount] = useState("500");
  const [period, setPeriod] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionPhase, setPermissionPhase] = useState<string | null>(null);
  const [orderIntentId, setOrderIntentId] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const permPollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (permPollRef.current) clearInterval(permPollRef.current);
    };
  }, []);

  // Poll permission phase until "active" once we're on step 4 with a pending intent.
  useEffect(() => {
    if (step !== 4 || !savedCard || !orderIntentId || permissionPhase === "active") return;
    const poll = async () => {
      try {
        const res = await authFetch(`/api/v1/rail3/cards/${savedCard.card_id}/permission/status`);
        const json = await res.json();
        if (json.phase) setPermissionPhase(json.phase);
        if (json.phase === "active" && permPollRef.current) {
          clearInterval(permPollRef.current);
          permPollRef.current = null;
        }
      } catch {}
    };
    permPollRef.current = setInterval(poll, 3000);
    poll();
    return () => { if (permPollRef.current) { clearInterval(permPollRef.current); permPollRef.current = null; } };
  }, [step, savedCard, orderIntentId, permissionPhase]);

  // Listen for Crossmint iframe postMessage handshake — only trust Crossmint origins.
  useEffect(() => {
    if (step !== 1) return;
    const trustedOrigins = new Set([
      "https://www.crossmint.com",
      "https://staging.crossmint.com",
    ]);
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
      const res = await authFetch("/api/v1/rail3/cards", {
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
      setSavedCard({ card_id: json.card_id, card_brand: data.brand, card_last4: data.last4 });
      setStep(2);
      startVerificationPoll(json.card_id);
    } catch (e: any) {
      setError(e.message);
    }
  }

  function startVerificationPoll(cardId: string) {
    setVerifying(true);
    const poll = async () => {
      try {
        const res = await authFetch(`/api/v1/rail3/cards/${cardId}/verification-status`);
        const json = await res.json();
        if (json.verification_status === "active") {
          if (pollRef.current) clearInterval(pollRef.current);
          setVerifying(false);
          setStep(3);
        } else if (json.verification_status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          setVerifying(false);
          setError("Verification failed. Try again or contact support.");
        }
      } catch {}
    };
    pollRef.current = setInterval(poll, 3000);
    poll();
  }

  async function submitPermission() {
    if (!savedCard) return;
    setError(null);
    setSubmitting(true);
    try {
      const body = permissionMode === "open"
        ? { mode: "open" }
        : { mode: "limited", max_amount_usd: Number(maxAmount), period };
      const res = await authFetch(`/api/v1/rail3/cards/${savedCard.card_id}/permission`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "permission_failed");
      setOrderIntentId(json.order_intent_id);
      setPermissionPhase(json.phase);
      const botsRes = await authFetch("/api/v1/bots/mine");
      const botsJson = await botsRes.json();
      setBots(botsJson.bots || []);
      setStep(4);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function linkBotAndFinish() {
    if (!savedCard) return;
    setError(null);
    setSubmitting(true);
    try {
      if (selectedBotId) {
        const res = await authFetch(`/api/v1/rail3/cards/${savedCard.card_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bot_id: selectedBotId }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "link_failed");
        }
      }
      router.push("/virtual-cards");
    } catch (e: any) {
      setError(e.message);
      setSubmitting(false);
    }
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

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2" data-testid="text-wizard-title">Set up your virtual card</h1>
        <p className="text-neutral-600 mb-8">Save a card once, then your agent can spend at any online merchant using one-time card numbers.</p>

        <StepIndicator step={step} />

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" data-testid="text-error">{error}</div>
        )}

        <div className="bg-white rounded-2xl border border-neutral-200 p-8">
          {step === 1 && (
            <div className="space-y-4">
              <StepHeader icon={<CreditCard className="w-5 h-5" />} title="Save your card" subtitle="US-issued Visa or Mastercard credit/debit only. Not supported: non-US, business, prepaid, Chase, Fidelity. AMEX/Ramp need Crossmint approval." />
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
              <StepHeader icon={<ShieldCheck className="w-5 h-5" />} title="Verify for agentic use" subtitle="Crossmint is verifying your card. Check your email and complete the passkey ceremony in the popup." />
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg" data-testid="status-verification">
                {verifying ? <Loader2 className="w-5 h-5 animate-spin text-blue-600" /> : <CheckCircle2 className="w-5 h-5 text-green-600" />}
                <span className="text-sm text-blue-900">{verifying ? "Waiting for verification..." : "Verified"}</span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <StepHeader icon={<KeyRound className="w-5 h-5" />} title="Set permission" subtitle="Decide how much your agent can spend on this card." />
              <RadioGroup value={permissionMode} onValueChange={(v) => setPermissionMode(v as "limited" | "open")}>
                <div className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-neutral-50" onClick={() => setPermissionMode("limited")}>
                  <RadioGroupItem value="limited" id="r-limited" data-testid="radio-mode-limited" />
                  <div className="flex-1">
                    <Label htmlFor="r-limited" className="font-medium cursor-pointer">Set spending limits</Label>
                    <p className="text-sm text-neutral-500 mt-0.5">Cap how much can be spent within a window.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-neutral-50" onClick={() => setPermissionMode("open")}>
                  <RadioGroupItem value="open" id="r-open" data-testid="radio-mode-open" />
                  <div className="flex-1">
                    <Label htmlFor="r-open" className="font-medium cursor-pointer">Allow anywhere</Label>
                    <p className="text-sm text-neutral-500 mt-0.5">No limit beyond Crossmint's $100k/year ceiling.</p>
                  </div>
                </div>
              </RadioGroup>

              {permissionMode === "limited" && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <Label htmlFor="amount">Max amount (USD)</Label>
                    <Input id="amount" type="number" min={1} value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} data-testid="input-max-amount" />
                  </div>
                  <div>
                    <Label htmlFor="period">Per period</Label>
                    <select id="period" value={period} onChange={(e) => setPeriod(e.target.value as any)} className="w-full h-10 px-3 border rounded-md" data-testid="select-period">
                      <option value="weekly">Week</option>
                      <option value="monthly">Month</option>
                      <option value="yearly">Year</option>
                    </select>
                  </div>
                </div>
              )}

              <Button onClick={submitPermission} disabled={submitting} className="w-full" data-testid="button-submit-permission">
                {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Continue
              </Button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              {permissionPhase !== "active" && orderIntentId && (
                <div className="space-y-2 mb-4 pb-4 border-b border-neutral-100">
                  <StepHeader icon={<ShieldCheck className="w-5 h-5" />} title="Authorize this permission" subtitle="Crossmint requires a passkey tap before this permission can issue card numbers." />
                  {iframeUrl ? (
                    <iframe
                      src={`${iframeOrigin}/embed/order-intent-verification?clientApiKey=${encodeURIComponent(clientKey!)}&orderIntentId=${encodeURIComponent(orderIntentId)}`}
                      className="w-full h-[420px] rounded-lg border border-neutral-200"
                      title="Authorize permission"
                      data-testid="iframe-authorize-permission"
                    />
                  ) : null}
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded text-sm text-blue-900" data-testid="status-permission-phase">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Waiting for authorization (phase: {permissionPhase || "requires-verification"})</span>
                  </div>
                </div>
              )}
              <StepHeader icon={<Link2 className="w-5 h-5" />} title="Link to a bot (optional)" subtitle="Pick which bot can use this card. You can change this later." />
              <div className="space-y-2">
                {bots.length === 0 ? (
                  <p className="text-sm text-neutral-500" data-testid="text-no-bots">No bots yet. You can link one later from the cards page.</p>
                ) : (
                  bots.map((b) => (
                    <label key={b.bot_id} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-neutral-50">
                      <input
                        type="radio"
                        name="bot"
                        value={b.bot_id}
                        checked={selectedBotId === b.bot_id}
                        onChange={() => setSelectedBotId(b.bot_id)}
                        data-testid={`radio-bot-${b.bot_id}`}
                      />
                      <span className="font-medium">{b.bot_name}</span>
                    </label>
                  ))
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => { setSelectedBotId(""); linkBotAndFinish(); }} disabled={submitting} data-testid="button-skip-link">Skip</Button>
                <Button onClick={linkBotAndFinish} disabled={submitting || permissionPhase !== "active" || (bots.length > 0 && !selectedBotId)} className="flex-1" data-testid="button-finish">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Finish
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
  const steps = ["Save", "Verify", "Permission", "Link"];
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => {
        const n = (i + 1) as Step;
        const active = step === n;
        const done = step > n;
        return (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${done ? "bg-green-500 text-white" : active ? "bg-primary text-white" : "bg-neutral-200 text-neutral-500"}`} data-testid={`step-indicator-${n}`}>
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
