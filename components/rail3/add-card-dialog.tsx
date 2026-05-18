"use client";

// Create a virtual card (= one Crossmint orderIntent on top of a saved PM) and
// then have the owner authorize it via the OrderIntentVerification SDK. No
// polling: the SDK fires onVerificationComplete, after which we refetch and close.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/features/platform-management/auth-fetch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Loader2, CheckCircle2, ChevronDown } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { OrderIntentVerification } from "@crossmint/client-sdk-react-ui";
import { Rail3CrossmintProvider } from "@/components/rail3/crossmint-provider";
import type { Rail3PaymentMethodInfo } from "@/components/wallet/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentMethods: Rail3PaymentMethodInfo[];
  onComplete: () => void;
}

const CATEGORY_SUGGESTIONS = ["Food", "Office", "Travel", "Marketing", "Subscriptions", "General"];

interface CreatedCard {
  cardId: string;
  orderIntentId: string;
  phase: string;
  // verificationConfig may be null if the intent is already active (no passkey required).
  verificationConfig: any | null;
}

export function AddCardDialog(props: Props) {
  // Only mount the Crossmint provider when the dialog is open (avoids loading
  // the SDK provider on every dashboard render).
  if (!props.open) return null;
  return (
    <Rail3CrossmintProvider>
      <AddCardDialogInner {...props} />
    </Rail3CrossmintProvider>
  );
}

function AddCardDialogInner({ open, onOpenChange, paymentMethods, onComplete }: Props) {
  const router = useRouter();
  // We no longer know per-PM enrollment status synchronously (it's lazy-fetched
  // per PM by the strip), so any saved PM is selectable here. If the owner picks
  // an un-enrolled PM the server will surface the error via order-intent creation.
  const selectablePMs = useMemo(() => paymentMethods, [paymentMethods]);
  const noPMs = selectablePMs.length === 0;

  const [pmId, setPmId] = useState<string>("");
  const [mode, setMode] = useState<"limited" | "open">("limited");
  const [maxAmount, setMaxAmount] = useState("500");
  const [period, setPeriod] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [category, setCategory] = useState<string>("General");
  const [cardName, setCardName] = useState<string>("");
  const [intent, setIntent] = useState<string>("");
  const [intentOpen, setIntentOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCard, setCreatedCard] = useState<CreatedCard | null>(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setPmId(selectablePMs[0]?.payment_method_id || "");
      setMode("limited");
      setMaxAmount("500");
      setPeriod("monthly");
      setCategory("General");
      setCardName("");
      setIntent("");
      setIntentOpen(false);
      setError(null);
      setCreatedCard(null);
    } else if (!pmId && selectablePMs[0]) {
      setPmId(selectablePMs[0].payment_method_id);
    }
  }, [open, selectablePMs]);

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
      if (intent.trim()) body.prompt = intent.trim();
      const res = await authFetch("/api/v1/rail3/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || "create_failed");
      setCreatedCard({
        cardId: json.card_id,
        orderIntentId: json.order_intent_id,
        phase: json.permission_phase,
        verificationConfig: json.verification_config || null,
      });
      onComplete();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="dialog-add-card">
        {noPMs ? (
          <>
            <DialogHeader>
              <DialogTitle>No real card yet</DialogTitle>
              <DialogDescription>
                You need to save a real card with Crossmint before you can create a virtual card.
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
                    {selectablePMs.map((pm) => (
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

              <div>
                <button
                  type="button"
                  onClick={() => setIntentOpen((v) => !v)}
                  className="flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900"
                  data-testid="button-toggle-intent"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${intentOpen ? "" : "-rotate-90"}`} />
                  Intent (optional)
                </button>
                {intentOpen && (
                  <div className="mt-2">
                    <Textarea
                      value={intent}
                      onChange={(e) => setIntent(e.target.value)}
                      placeholder="e.g. Weekly grocery runs from Whole Foods and Trader Joe's only."
                      rows={2}
                      maxLength={1000}
                      data-testid="input-intent"
                    />
                    <p className="text-xs text-neutral-500 mt-1">
                      Recorded on the Crossmint mandate as the agent's prompt for audit. Doesn't enforce anything beyond the limit above.
                    </p>
                  </div>
                )}
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
              {createdCard.phase === "active" || !createdCard.verificationConfig ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg text-sm text-green-800" data-testid="status-authorized">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>Authorized. You can close this dialog.</span>
                </div>
              ) : (
                <div className="rounded-lg border border-neutral-200 overflow-hidden" data-testid="container-order-intent-verification">
                  <OrderIntentVerification
                    config={createdCard.verificationConfig}
                    orderIntent={{ orderIntentId: createdCard.orderIntentId } as any}
                    onVerificationComplete={() => {
                      setCreatedCard((cur) => cur ? { ...cur, phase: "active" } : cur);
                      onComplete();
                    }}
                    onVerificationError={(err) => setError(err.message)}
                  />
                </div>
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
