"use client";

// Create a virtual card (= one Crossmint orderIntent on top of a saved PM), then
// have the owner authorize it via the OrderIntentVerification SDK. Linking a bot
// is optional — botless cards are vault-only until the owner attaches a bot.
// Crossmint agent is per-owner, created server-side on first card.
//
// Verification is rendered OUTSIDE the Radix Dialog (as a sibling) so that
// BasisTheory's mock Visa overlay and InstructionVerificationModal aren't
// blocked by Radix's `pointer-events: none` body lock or hidden behind its
// backdrop. See project_knowledge/currently_building/rail3/rail3-verification-outside-dialog-plan.md

import { memo, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/features/platform-management/auth-fetch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Loader2, ChevronDown } from "lucide-react";
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

interface BotOption {
  bot_id: string;
  bot_name: string;
}

const NO_BOT_VALUE = "__none__";
const CATEGORY_SUGGESTIONS = ["Food", "Office", "Travel", "Marketing", "Subscriptions", "General"];

interface CreatedCard {
  cardId: string;
  orderIntentId: string;
  paymentMethodId: string;
  phase: string;
  verificationConfig: any | null;
}

export function AddCardDialog(props: Props) {
  // createdCard lives at the outer wrapper so verification stays mounted even
  // after the inner Radix dialog closes (which it does the moment the card is
  // created — see plan doc).
  const [createdCard, setCreatedCard] = useState<CreatedCard | null>(null);
  if (!props.open && !createdCard) return null;
  return (
    <Rail3CrossmintProvider>
      <AddCardDialogInner
        {...props}
        createdCard={createdCard}
        setCreatedCard={setCreatedCard}
      />
    </Rail3CrossmintProvider>
  );
}

// Memoized wrapper so OrderIntentVerification only re-mounts when the
// orderIntent's identity actually changes. Without this, every parent re-render
// (Firebase JWT bridge ticks, bots loading, error state, etc.) hands the SDK
// a fresh object literal, restarting the verification ceremony in a loop.
interface OrderIntentVerificationStableProps {
  orderIntentId: string;
  paymentMethodId: string;
  verificationConfig: any;
  onComplete: () => void;
  onError: (msg: string) => void;
}

const OrderIntentVerificationStable = memo(function OrderIntentVerificationStable({
  orderIntentId, paymentMethodId, verificationConfig, onComplete, onError,
}: OrderIntentVerificationStableProps) {
  const orderIntent = useMemo(
    () => ({
      orderIntentId,
      phase: "requires-verification",
      mandates: [],
      payment: { paymentMethodId },
      verificationConfig,
    }),
    [orderIntentId, paymentMethodId, verificationConfig],
  );
  return (
    <OrderIntentVerification
      orderIntent={orderIntent as any}
      onVerificationComplete={onComplete}
      onVerificationError={(err) => onError(err instanceof Error ? err.message : String(err))}
    />
  );
});

interface InnerProps extends Props {
  createdCard: CreatedCard | null;
  setCreatedCard: (c: CreatedCard | null) => void;
}

function AddCardDialogInner({ open, onOpenChange, paymentMethods, onComplete, createdCard, setCreatedCard }: InnerProps) {
  const router = useRouter();
  const selectablePMs = useMemo(() => paymentMethods, [paymentMethods]);
  const noPMs = selectablePMs.length === 0;

  const [pmId, setPmId] = useState<string>("");
  const [botId, setBotId] = useState<string>(NO_BOT_VALUE);
  const [bots, setBots] = useState<BotOption[]>([]);
  const [botsLoading, setBotsLoading] = useState(true);
  const [mode, setMode] = useState<"limited" | "open">("limited");
  const [maxAmount, setMaxAmount] = useState("500");
  const [period, setPeriod] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [category, setCategory] = useState<string>("General");
  const [cardName, setCardName] = useState<string>("");
  const [intent, setIntent] = useState<string>("");
  const [intentOpen, setIntentOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load this owner's bots so we can offer an optional link.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setBotsLoading(true);
    (async () => {
      try {
        const res = await authFetch("/api/v1/bots/mine");
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(json.error || "bots_failed");
        const opts: BotOption[] = (json.bots || []).map((b: any) => ({ bot_id: b.bot_id, bot_name: b.bot_name }));
        setBots(opts);
      } catch {
        if (!cancelled) setBots([]);
      } finally {
        if (!cancelled) setBotsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  // Reset form fields on close (createdCard is owned by the outer wrapper).
  useEffect(() => {
    if (!open) {
      setPmId(selectablePMs[0]?.payment_method_id || "");
      setBotId(NO_BOT_VALUE);
      setMode("limited");
      setMaxAmount("500");
      setPeriod("monthly");
      setCategory("General");
      setCardName("");
      setIntent("");
      setIntentOpen(false);
      setError(null);
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
      if (botId && botId !== NO_BOT_VALUE) body.bot_id = botId;
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
      const needsVerification =
        json.permission_phase !== "active" && !!json.verification_config;
      if (needsVerification) {
        // Stash the new card on the outer wrapper so the verification overlay
        // (below) mounts. The inner Radix dialog hides as soon as createdCard
        // is set. onComplete fires after verification finishes (or is dismissed).
        setCreatedCard({
          cardId: json.card_id,
          orderIntentId: json.order_intent_id,
          paymentMethodId: pmId,
          phase: json.permission_phase,
          verificationConfig: json.verification_config,
        });
        onOpenChange(false);
      } else {
        // Card was created already-active (or with no verification config to
        // present). Skip the verification overlay entirely.
        onComplete();
        onOpenChange(false);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Verification is rendered as a sibling of the dialog. When createdCard is
  // set, the dialog hides itself (open=false) and only the BasisTheory modal
  // + mock Visa overlay are on screen.
  const showVerification =
    !!createdCard && !!createdCard.verificationConfig && createdCard.phase !== "active";

  function finishVerification() {
    setCreatedCard(null);
    onComplete();
  }

  return (
    <>
      <Dialog open={open && !createdCard} onOpenChange={onOpenChange}>
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
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Add virtual card</DialogTitle>
                <DialogDescription>One spending permission backed by a real card. Link a bot now or later.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="bot-select">Link a bot (optional)</Label>
                    <Select value={botId} onValueChange={setBotId}>
                      <SelectTrigger id="bot-select" data-testid="select-bot">
                        <SelectValue placeholder={botsLoading ? "Loading…" : "— None —"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_BOT_VALUE} data-testid="option-bot-none">— None (vault only) —</SelectItem>
                        {bots.map((b) => (
                          <SelectItem key={b.bot_id} value={b.bot_id} data-testid={`option-bot-${b.bot_id}`}>
                            {b.bot_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-neutral-500 mt-1">
                      We've issued you an agent. Link a bot now or later — your card works either way.
                    </p>
                  </div>
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
          )}
        </DialogContent>
      </Dialog>

      {showVerification && createdCard && (
        <OrderIntentVerificationStable
          orderIntentId={createdCard.orderIntentId}
          paymentMethodId={createdCard.paymentMethodId}
          verificationConfig={createdCard.verificationConfig}
          onComplete={finishVerification}
          onError={finishVerification}
        />
      )}
    </>
  );
}
