"use client";

import { useState } from "react";
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

interface Props {
  paymentMethods: Rail3PaymentMethodInfo[];
  loading: boolean;
  onChange: () => void;
}

export function PaymentMethodsStrip({ paymentMethods, loading, onChange }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [removeTarget, setRemoveTarget] = useState<Rail3PaymentMethodInfo | null>(null);
  const [removing, setRemoving] = useState(false);

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
            const verified = pm.verification_status === "active";
            return (
              <div
                key={pm.payment_method_id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-50"
                data-testid={`pm-${pm.payment_method_id}`}
              >
                <CreditCard className="w-4 h-4 text-neutral-500" />
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-neutral-900">
                    {(pm.card_brand || "Card").toUpperCase()} •••• {pm.card_last4 || "????"}
                  </div>
                  <div className="text-xs text-neutral-500 flex items-center gap-2">
                    {verified ? (
                      <span className="inline-flex items-center gap-1 text-green-600"><ShieldCheck className="w-3 h-3" /> Verified</span>
                    ) : pm.verification_status === "pending" ? (
                      <span className="inline-flex items-center gap-1 text-amber-600"><Loader2 className="w-3 h-3 animate-spin" /> Pending</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-600"><AlertCircle className="w-3 h-3" /> Failed</span>
                    )}
                    <span className="text-neutral-400">·</span>
                    <span>{pm.virtual_card_count} virtual card{pm.virtual_card_count === 1 ? "" : "s"}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRemoveTarget(pm)}
                  className="ml-1 p-1 rounded hover:bg-neutral-200 text-neutral-400 hover:text-red-600"
                  title="Remove real card"
                  data-testid={`button-remove-pm-${pm.payment_method_id}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
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
              onClick={(e) => { e.preventDefault(); handleRemove(); }}
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
