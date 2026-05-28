"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { authFetch } from "@/features/platform-management/auth-fetch";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface PmChange { payment_method_id: string; brand?: string | null; last4?: string | null; reason?: string }
interface CardChange { card_id: string; card_name: string; order_intent_id: string; fields?: string[]; reason?: string }

interface SyncResult {
  payment_methods: { added: PmChange[]; removed: PmChange[]; removed_blocked: PmChange[]; changed: PmChange[] };
  cards: { added: CardChange[]; removed: CardChange[]; changed: CardChange[] };
  errors: string[];
  synced_at: string;
}

interface Props {
  onSynced?: () => void;
}

function totalChanges(r: SyncResult): number {
  return (
    r.payment_methods.added.length + r.payment_methods.removed.length +
    r.payment_methods.removed_blocked.length + r.payment_methods.changed.length +
    r.cards.added.length + r.cards.removed.length + r.cards.changed.length
  );
}

function pmLabel(p: PmChange): string {
  const brand = p.brand ? p.brand : "Card";
  const last4 = p.last4 ? `••${p.last4}` : p.payment_method_id.slice(0, 8);
  return `${brand} ${last4}`;
}

export function Rail3SyncButton({ onSynced }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function runSync() {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/v1/rail3/sync", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message || json.error || "Sync failed");
        setResult(null);
      } else {
        setResult(json);
        if (onSynced) onSynced();
      }
      setOpen(true);
    } catch (e: any) {
      setError(e.message || "Sync failed");
      setResult(null);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }

  const changes = result ? totalChanges(result) : 0;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={runSync}
        disabled={loading}
        data-testid="button-rail3-sync"
      >
        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Refreshing…" : "Refresh from Crossmint"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-rail3-sync-result">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {error ? (
                <><AlertCircle className="w-5 h-5 text-red-600" /> Refresh failed</>
              ) : changes === 0 ? (
                <><CheckCircle2 className="w-5 h-5 text-green-600" /> Up to date</>
              ) : (
                <><RefreshCw className="w-5 h-5 text-orange-600" /> {changes} change{changes === 1 ? "" : "s"} synced</>
              )}
            </DialogTitle>
            <DialogDescription>
              {error
                ? "Couldn't reach Crossmint. Try again in a moment."
                : changes === 0
                ? "Your local state matches Crossmint."
                : "Your local cards and payment methods are now in sync with Crossmint."}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3" data-testid="text-rail3-sync-error">
              {error}
            </div>
          )}

          {result && changes > 0 && (
            <div className="space-y-4 max-h-80 overflow-y-auto text-sm">
              {result.payment_methods.added.length > 0 && (
                <ChangeBlock title="Payment methods added" tone="green" items={result.payment_methods.added.map(pmLabel)} />
              )}
              {result.payment_methods.changed.length > 0 && (
                <ChangeBlock title="Payment methods updated" tone="blue" items={result.payment_methods.changed.map(pmLabel)} />
              )}
              {result.payment_methods.removed.length > 0 && (
                <ChangeBlock title="Payment methods removed" tone="red" items={result.payment_methods.removed.map(pmLabel)} />
              )}
              {result.payment_methods.removed_blocked.length > 0 && (
                <ChangeBlock
                  title="Payment methods gone on Crossmint but kept locally"
                  tone="amber"
                  items={result.payment_methods.removed_blocked.map((p) => `${pmLabel(p)} — ${p.reason ?? "has local dependents"}`)}
                />
              )}
              {result.cards.added.length > 0 && (
                <ChangeBlock title="Virtual cards imported" tone="green" items={result.cards.added.map((c) => `${c.card_name} (${c.order_intent_id.slice(0, 8)}…)`)} />
              )}
              {result.cards.changed.length > 0 && (
                <ChangeBlock
                  title="Virtual cards updated"
                  tone="blue"
                  items={result.cards.changed.map((c) => `${c.card_name} — ${(c.fields ?? []).join(", ")}`)}
                />
              )}
              {result.cards.removed.length > 0 && (
                <ChangeBlock title="Virtual cards removed" tone="red" items={result.cards.removed.map((c) => `${c.card_name} (${c.order_intent_id.slice(0, 8)}…)`)} />
              )}
            </div>
          )}

          {result && result.errors.length > 0 && (
            <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3" data-testid="text-rail3-sync-warnings">
              <div className="font-semibold mb-1">Warnings</div>
              <ul className="list-disc list-inside space-y-0.5">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setOpen(false)} data-testid="button-rail3-sync-close">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ChangeBlock({ title, tone, items }: { title: string; tone: "green" | "blue" | "red" | "amber"; items: string[] }) {
  const toneClasses = {
    green: "border-green-200 bg-green-50 text-green-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    red: "border-red-200 bg-red-50 text-red-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
  }[tone];
  return (
    <div className={`border rounded-lg p-3 ${toneClasses}`}>
      <div className="font-semibold mb-1">{title}</div>
      <ul className="list-disc list-inside space-y-0.5">
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  );
}
