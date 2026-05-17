"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/features/platform-management/auth-fetch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Loader2, ShieldCheck, CheckCircle2 } from "lucide-react";
import type { Rail3PaymentMethodInfo } from "@/components/wallet/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentMethods: Rail3PaymentMethodInfo[];
  onComplete: () => void;
}

const CATEGORY_SUGGESTIONS = ["Food", "Office", "Travel", "Marketing", "Subscriptions", "General"];

export function AddCardDialog({ open, onOpenChange, paymentMethods, onComplete }: Props) {
  const router = useRouter();
  const verifiedPMs = useMemo(() => paymentMethods.filter((p) => p.verification_status === "active"), [paymentMethods]);
  const noVerifiedPMs = verifiedPMs.length === 0;

  // Default to most recently used (server orders by lastUsedAt desc).
  const [pmId, setPmId] = useState<string>("");
  const [mode, setMode] = useState<"limited" | "open">("limited");
  const [maxAmount, setMaxAmount] = useState("500");
  const [period, setPeriod] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [category, setCategory] = useState<string>("General");
  const [cardName, setCardName] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Post-create authorization step.
  const [createdCard, setCreatedCard] = useState<{ cardId: string; orderIntentId: string; phase: string } | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setPmId(verifiedPMs[0]?.payment_method_id || "");
      setMode("limited");
      setMaxAmount("500");
      setPeriod("monthly");
      setCategory("General");
      setCardName("");
      setError(null);
      setCreatedCard(null);
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    } else if (!pmId && verifiedPMs[0]) {
      setPmId(verifiedPMs[0].payment_method_id);
    }
  }, [open, verifiedPMs]);

  // Poll authorization status once card is created.
  useEffect(() => {
    if (!createdCard || createdCard.phase === "active") return;
    const poll = async () => {
      try {
        const res = await authFetch(`/api/v1/rail3/cards/${createdCard.cardId}/authorization-status`);
        const json = await res.json();
        if (json.phase) {
          setCreatedCard((cur) => cur ? { ...cur, phase: json.phase } : cur);
          if (json.phase === "active" && pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
            onComplete();
          }
        }
      } catch {}
    };
    pollRef.current = setInterval(poll, 3000);
    poll();
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [createdCard, onComplete]);

  async function handleCreate() {
    setError(null);
    setSubmitting(true);
    try {
      const body: any = {
        payment_method_id: pmId,
        mode,
        card_name: cardName || undefined,
        category: category || null,
      };
      if (mode === "limited") {
        body.max_amount_usd = Number(maxAmount);
        body.period = period;
      }
      const res = await authFetch("/api/v1/rail3/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || "create_failed");
      setCreatedCard({ cardId: json.card_id, orderIntentId: json.order_intent_id, phase: json.permission_phase });
      onComplete();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const clientKey = process.env.NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY;
  const iframeOrigin = process.env.NEXT_PUBLIC_CROSSMINT_ENV === "staging"
    ? "https://staging.crossmint.com"
    : "https://www.crossmint.com";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="dialog-add-card">
        {noVerifiedPMs ? (
          <>
            <DialogHeader>
              <DialogTitle>No verified real card yet</DialogTitle>
              <DialogDescription>
                You need to save and verify a real card with Crossmint before you can create a virtual card.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-add-card">Cancel</Button>
              <Button onClick={() => router.push("/setup/rail3")} data-testid="button-go-save-card">
                <CreditCard className="w-4 h-4 mr-2" />
                Save a real card
              </Button>
            </DialogFooter>
          </>
        ) : !createdCard ? (
          <>
            <DialogHeader>
              <DialogTitle>Add virtual card</DialogTitle>
              <DialogDescription>One spending permission backed by a real card you've already saved.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="pm-select">Backing real card</Label>
                <Select value={pmId} onValueChange={setPmId}>
                  <SelectTrigger id="pm-select" data-testid="select-payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {verifiedPMs.map((pm) => (
                      <SelectItem key={pm.payment_method_id} value={pm.payment_method_id} data-testid={`option-pm-${pm.payment_method_id}`}>
                        {(pm.card_brand || "Card").toUpperCase()} •••• {pm.card_last4 || "????"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Spending</Label>
                <RadioGroup value={mode} onValueChange={(v) => setMode(v as "limited" | "open")} className="mt-2">
                  <div className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-neutral-50" onClick={() => setMode("limited")}>
                    <RadioGroupItem value="limited" id="m-limited" data-testid="radio-mode-limited" />
                    <Label htmlFor="m-limited" className="font-medium cursor-pointer flex-1">Spending limit</Label>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-neutral-50" onClick={() => setMode("open")}>
                    <RadioGroupItem value="open" id="m-open" data-testid="radio-mode-open" />
                    <Label htmlFor="m-open" className="font-medium cursor-pointer flex-1">Allow anywhere</Label>
                  </div>
                </RadioGroup>
              </div>

              {mode === "limited" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="amount">Max (USD)</Label>
                    <Input id="amount" type="number" min={1} value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} data-testid="input-max-amount" />
                  </div>
                  <div>
                    <Label htmlFor="period">Per</Label>
                    <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
                      <SelectTrigger id="period" data-testid="select-period"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Week</SelectItem>
                        <SelectItem value="monthly">Month</SelectItem>
                        <SelectItem value="yearly">Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input id="category" list="cat-list" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Food" data-testid="input-category" />
                  <datalist id="cat-list">
                    {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <Label htmlFor="card-name">Nickname (optional)</Label>
                  <Input id="card-name" value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="Auto" data-testid="input-card-name" />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" data-testid="text-error">{error}</div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting} data-testid="button-cancel">Cancel</Button>
              <Button onClick={handleCreate} disabled={submitting || !pmId} data-testid="button-create-card">
                {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Create card
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Authorize this card</DialogTitle>
              <DialogDescription>Crossmint requires a passkey tap before this card can issue one-time numbers.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {createdCard.phase === "active" ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg text-sm text-green-800" data-testid="status-authorized">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>Authorized. You can close this dialog.</span>
                </div>
              ) : (
                <>
                  {clientKey ? (
                    <iframe
                      src={`${iframeOrigin}/embed/order-intent-verification?clientApiKey=${encodeURIComponent(clientKey)}&orderIntentId=${encodeURIComponent(createdCard.orderIntentId)}`}
                      className="w-full h-[420px] rounded-lg border border-neutral-200"
                      title="Authorize permission"
                      data-testid="iframe-authorize"
                    />
                  ) : (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
                      Crossmint client API key missing. Authorize at <code className="font-mono">orderIntentId={createdCard.orderIntentId}</code>.
                    </div>
                  )}
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded text-sm text-blue-900" data-testid="status-authorization-phase">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Waiting for authorization (phase: {createdCard.phase})</span>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)} data-testid="button-close-authorize">
                {createdCard.phase === "active" ? "Done" : "Finish later"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
