"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authFetch } from "@/features/platform-management/auth-fetch";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CreditCard, Plus, Trash2, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Rail3PaymentMethodInfo } from "@/components/wallet/types";

const FUNDING_TYPE_LABEL: Record<string, string> = {
  credit: "Credit",
  debit: "Debit",
  prepaid: "Prepaid",
  unknown: "Card",
};

interface Props {
  paymentMethods: Rail3PaymentMethodInfo[];
  loading: boolean;
  onChange: () => void;
}

type EnrollmentMap = Record<string, { status: string | "loading" | "error"; message?: string }>;

export function PaymentMethodsStrip({ paymentMethods, loading, onChange }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [removeTarget, setRemoveTarget] = useState<Rail3PaymentMethodInfo | null>(null);
  const [removing, setRemoving] = useState(false);
  // Enrollment status is fetched live from Crossmint per PM (it's not persisted
  // locally any more).
  const [enrollments, setEnrollments] = useState<EnrollmentMap>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: EnrollmentMap = {};
      paymentMethods.forEach((pm) => { next[pm.payment_method_id] = { status: "loading" }; });
      if (!cancelled) setEnrollments(next);

      await Promise.all(paymentMethods.map(async (pm) => {
        try {
          const res = await authFetch(`/api/v1/rail3/payment-methods/${pm.payment_method_id}/enrollment`);
          const json = await res.json();
          if (cancelled) return;
          if (!res.ok) {
            // 404 = no enrollment created yet → treat as pending so the user can act.
            const status = res.status === 404 ? "missing" : "error";
            setEnrollments((cur) => ({ ...cur, [pm.payment_method_id]: { status, message: json.message || json.error } }));
            return;
          }
          setEnrollments((cur) => ({
            ...cur,
            [pm.payment_method_id]: { status: json.enrollment?.status || "unknown" },
          }));
        } catch (e: any) {
          if (cancelled) return;
          setEnrollments((cur) => ({ ...cur, [pm.payment_method_id]: { status: "error", message: e.message } }));
        }
      }));
    })();
    return () => { cancelled = true; };
  }, [paymentMethods]);

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      const res = await authFetch(`/api/v1/rail3/payment-methods/${removeTarget.payment_method_id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || json.error || "remove_failed");
      toast({ title: "Real card removed", description: `${(removeTarget.card_brand || "Card").toUpperCase()} •••• ${removeTarget.card_last4 || "????"}` });
      onChange();
    } catch (e: any) {
      toast({ title: "Couldn't remove", description: e.message, variant: "destructive" });
    } finally {
      setRemoving(false);
      setRemoveTarget(null);
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4" data-testid="section-payment-methods">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">Real cards on file</h3>
          <p className="text-xs text-neutral-500 mt-0.5">Vaulted with Crossmint. Each virtual card spends from one of these.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/setup/rail3")}
          data-testid="button-add-real-card"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add real card
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-3 text-sm text-neutral-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : paymentMethods.length === 0 ? (
        <div className="flex items-center gap-2 py-3 text-sm text-neutral-500" data-testid="text-no-payment-methods">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          No real cards saved yet. Save one before creating a virtual card.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {paymentMethods.map((pm) => {
            const e = enrollments[pm.payment_method_id];
            const fundingLabel = pm.funding_type ? (FUNDING_TYPE_LABEL[pm.funding_type] || pm.funding_type) : null;
            const hasVirtuals = pm.virtual_card_count > 0;
            return (
              <Link
                key={pm.payment_method_id}
                href={`/real-cards/${pm.payment_method_id}`}
                className="flex items-center gap-3 px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 hover:border-neutral-300 transition-colors"
                data-testid={`pm-${pm.payment_method_id}`}
              >
                <CreditCard className="w-4 h-4 text-neutral-500" />
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-neutral-900 flex items-center gap-1.5">
                    {pm.issuer_name && <span className="text-neutral-600 font-normal">{pm.issuer_name}</span>}
                    <span>{(pm.card_brand || "Card").toUpperCase()} •••• {pm.card_last4 || "????"}</span>
                    {pm.is_default && (
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-semibold">Default</span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-500 flex items-center gap-2">
                    <EnrollmentBadge status={e?.status} />
                    {fundingLabel && (
                      <>
                        <span className="text-neutral-400">·</span>
                        <span>{fundingLabel}</span>
                      </>
                    )}
                    <span className="text-neutral-400">·</span>
                    <span>{pm.virtual_card_count} virtual card{pm.virtual_card_count === 1 ? "" : "s"}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); setRemoveTarget(pm); }}
                  disabled={hasVirtuals}
                  className="ml-1 p-1 rounded hover:bg-neutral-200 text-neutral-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-neutral-400"
                  title={hasVirtuals ? "Remove the virtual cards first" : "Remove real card"}
                  data-testid={`button-remove-pm-${pm.payment_method_id}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </Link>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this real card?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget && removeTarget.virtual_card_count > 0
                ? `This card backs ${removeTarget.virtual_card_count} virtual card${removeTarget.virtual_card_count === 1 ? "" : "s"}. Delete those first.`
                : "It will be removed from the Crossmint vault."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(ev) => { ev.preventDefault(); handleRemove(); }}
              disabled={removing || (removeTarget?.virtual_card_count || 0) > 0}
              data-testid="button-confirm-remove-pm"
            >
              {removing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EnrollmentBadge({ status }: { status?: string }) {
  if (!status || status === "loading") {
    return <span className="inline-flex items-center gap-1 text-neutral-400"><Loader2 className="w-3 h-3 animate-spin" /> Checking</span>;
  }
  if (status === "active") {
    return <span className="inline-flex items-center gap-1 text-green-600"><ShieldCheck className="w-3 h-3" /> Enrolled</span>;
  }
  if (status === "pending" || status === "missing") {
    return <span className="inline-flex items-center gap-1 text-amber-600"><AlertCircle className="w-3 h-3" /> Awaiting passkey</span>;
  }
  if (status === "failed") {
    return <span className="inline-flex items-center gap-1 text-red-600"><AlertCircle className="w-3 h-3" /> Failed</span>;
  }
  return <span className="inline-flex items-center gap-1 text-neutral-500">{status}</span>;
}
