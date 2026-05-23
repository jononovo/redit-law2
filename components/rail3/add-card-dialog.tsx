"use client";

// Create a virtual card (= one Crossmint orderIntent on top of a saved PM), then
// have the owner authorize it via the OrderIntentVerification SDK. Linking a bot
// is optional — botless cards are vault-only until the owner attaches a bot.
// Crossmint agent is per-owner, created server-side on first card.
//
// Rendered inline as a panel (not a modal). Wrapping the SDK inside a Radix
// <Dialog> set pointer-events:none on <body>, which body-portaled SDK overlays
// inherited and made the passkey ceremony un-clickable. Matches the shape used
// by Crossmint's card-permissions-quickstart.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/features/platform-management/auth-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Loader2, CheckCircle2, ChevronDown, X } from "lucide-react";
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
  phase: string;
  verificationConfig: any | null;
}

export function AddCardDialog(props: Props) {
  if (!props.open) return null;
  return (
    <Rail3CrossmintProvider>
      <AddCardPanel {...props} />
    </Rail3CrossmintProvider>
  );
}

function PanelShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-6" data-testid="panel-add-card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-neutral-900">{title}</h2>
          {subtitle && <p className="text-sm text-neutral-500 mt-0.5">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-700 transition-colors p-1 -m-1"
          data-testid="button-close-panel"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      {children}
    </div>
  );
}

function AddCardPanel({ open, onOpenChange, paymentMethods, onComplete }: Props) {
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
  const [createdCard, setCreatedCard] = useState<CreatedCard | null>(null);

  // Reconcile against Crossmint when the SDK signals verification finished.
  // The SDK callback only says "ceremony ended"; only Crossmint knows the
  // resulting phase. useCallback keeps the reference stable so the SDK doesn't
  // re-mount on every parent re-render.
  const createdCardId = createdCard?.cardId;
  const handleVerificationComplete = useCallback(async () => {
    if (!createdCardId) return;
    try {
      const res = await authFetch(`/api/v1/rail3/cards/${createdCardId}/refresh-phase`, { method: "POST" });
      const json = await res.json();
      if (res.ok && json.status) {
        setCreatedCard((cur) => cur ? { ...cur, phase: json.status } : cur);
      } else {
        setError(json.message || json.error || "verification_refresh_failed");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      onComplete();
    }
  }, [createdCardId, onComplete]);

  const handleVerificationError = useCallback(
    (err: unknown) => setError(err instanceof Error ? err.message : String(err)),
    [],
  );

  // Stable orderIntent reference for the SDK — derived from state, only changes
  // when the underlying card changes.
  const verificationOrderIntent = useMemo(() => {
    if (!createdCard?.verificationConfig) return null;
    return {
      orderIntentId: createdCard.orderIntentId,
      phase: "requires-verification" as const,
      mandates: [],
      payment: { paymentMethodId: pmId },
      verificationConfig: createdCard.verificationConfig,
    };
  }, [createdCard?.orderIntentId, createdCard?.verificationConfig, pmId]);

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

  // Reset on close
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
      setCreatedCard({
        cardId: json.card_id,
        orderIntentId: json.order_intent_id,
        phase: json.status,
        verificationConfig: json.verification_config || null,
      });
      onComplete();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const close = () => onOpenChange(false);

  if (noPMs) {
    return (
      <PanelShell title="No real card yet" subtitle="Save a real card with Crossmint before creating a virtual card." onClose={close}>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={close} data-testid="button-cancel-add-card">Cancel</Button>
          <Button onClick={() => router.push("/setup/rail3")} data-testid="button-go-save-card">
            <CreditCard className="w-4 h-4 mr-2" />
            Save a real card
          </Button>
        </div>
      </PanelShell>
    );
  }

  if (createdCard) {
    const authorized = createdCard.phase === "active" || !createdCard.verificationConfig;
    return (
      <PanelShell
        title="Authorize this card"
        subtitle="Crossmint requires a passkey tap before this card can issue one-time numbers."
        onClose={close}
      >
        <div className="space-y-3">
          {authorized ? (
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg text-sm text-green-800" data-testid="status-authorized">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span>Authorized. You can close this panel.</span>
            </div>
          ) : (
            verificationOrderIntent && (
              <div className="rounded-lg border border-neutral-200 overflow-hidden" data-testid="container-order-intent-verification">
                <OrderIntentVerification
                  orderIntent={verificationOrderIntent as any}
                  onVerificationComplete={handleVerificationComplete}
                  onVerificationError={handleVerificationError}
                />
              </div>
            )
          )}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" data-testid="text-error">{error}</div>
          )}
          <div className="flex justify-end">
            <Button onClick={close} data-testid="button-close-authorize">
              {authorized ? "Done" : "Finish later"}
            </Button>
          </div>
        </div>
      </PanelShell>
    );
  }

  return (
    <PanelShell
      title="Add virtual card"
      subtitle="One spending permission backed by a real card. Link a bot now or later."
      onClose={close}
    >
      <div className="space-y-4">
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

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={close} disabled={submitting} data-testid="button-cancel">Cancel</Button>
          <Button onClick={handleCreate} disabled={submitting || !pmId} data-testid="button-create-card">
            {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Create card
          </Button>
        </div>
      </div>
    </PanelShell>
  );
}
