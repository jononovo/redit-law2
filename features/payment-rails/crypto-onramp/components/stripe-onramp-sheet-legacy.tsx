// LEGACY: This component has been superseded by lib/payments/components/fund-wallet-sheet.tsx
// Retained for reference or potential reuse. No active pages import this file.

"use client";

import { Loader2, DollarSign, Copy, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import type { useStripeOnramp } from "./use-stripe-onramp-legacy";

type OnrampState = ReturnType<typeof useStripeOnramp>;

export interface StripeOnrampSheetProps {
  onramp: OnrampState;
}

export function StripeOnrampSheet({ onramp }: StripeOnrampSheetProps) {
  const { toast } = useToast();
  const walletName = onramp.wallet?.bot_name && onramp.wallet.bot_name !== "Unknown Bot"
    ? onramp.wallet.bot_name
    : null;

  const title = walletName
    ? `Fund Wallet "${walletName}" via Stripe/Link`
    : "Fund Wallet via Stripe/Link";

  const shortTitle = walletName
    ? `Fund "${walletName}"`
    : "Fund Wallet";

  return (
    <>
      <Sheet open={onramp.isOpen} onOpenChange={(open) => { if (!open) onramp.requestClose(); }}>
        <SheetContent
          side="right"
          size="lg"
          overlayTitle={title}
          overlayDescription={"Transfer to your USDC wallet.\nUse a credit card or bank connection via Stripe."}
          overlayExtra={onramp.wallet ? (
            <div className="mt-6 space-y-4 max-w-xs mx-auto">
              <div>
                <p className="text-sm text-white/70 font-semibold mb-2">Wallet Address</p>
                <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                  <code className="text-sm text-white/70 font-mono truncate flex-1" data-testid="text-onramp-wallet-address">
                    {onramp.wallet.address}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(onramp.wallet!.address);
                      toast({ title: "Wallet address copied!" });
                    }}
                    className="text-white/70 hover:text-white transition-colors flex-shrink-0 cursor-pointer"
                    data-testid="button-copy-onramp-address"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-white/70 mt-2 leading-relaxed">
                  You will need to paste your wallet address when funding for the first time. Copy it from here.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full border-white/30 text-white/70 hover:bg-white/10 hover:text-white cursor-pointer"
                onClick={() => onramp.requestClose()}
                data-testid="button-close-stripe-funding"
              >
                Close Stripe Funding
              </Button>
            </div>
          ) : undefined}
          className="overflow-y-auto p-0"
          data-testid="drawer-onramp"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <SheetTitle className="sr-only">{title}</SheetTitle>
          <SheetDescription className="sr-only">
            Transfer to your USDC wallet. Use a credit card or bank connection via Stripe.
          </SheetDescription>
          <div className="p-6 md:hidden border-b border-border">
            <div className="flex items-center gap-2 pr-8">
              <DollarSign className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <h2 className="text-lg font-semibold text-foreground">{shortTitle}</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Transfer to your USDC wallet here on CreditClaw.
            </p>
            {onramp.wallet && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-1">Wallet Address</p>
                <div className="flex items-center gap-2 bg-neutral-100 rounded-lg px-3 py-2">
                  <code className="text-xs font-mono truncate flex-1">{onramp.wallet.address}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(onramp.wallet!.address);
                      toast({ title: "Wallet address copied!" });
                    }}
                    className="text-neutral-400 hover:text-neutral-700 transition-colors flex-shrink-0 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Paste this address when prompted during Stripe funding.
                </p>
              </div>
            )}
          </div>
          <div className="flex-1 relative min-h-[500px]">
            {onramp.loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <p className="text-sm text-muted-foreground">Loading Stripe onramp...</p>
                </div>
              </div>
            )}
            <div ref={onramp.mountRef} id="stripe-onramp-element" className="w-full min-h-[480px] p-4" data-testid="container-onramp-widget" />
          </div>
          <div className="p-4 border-t border-border md:hidden">
            <Button
              variant="outline"
              className="w-full cursor-pointer"
              onClick={() => onramp.requestClose()}
              data-testid="button-close-stripe-funding-mobile"
            >
              Close Stripe Funding
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={onramp.showCloseConfirm} onOpenChange={(open) => { if (!open) onramp.cancelClose(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Close Stripe Funding?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to close this Stripe Funding process? You will lose your progress.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-close-funding">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => onramp.confirmClose()}
              data-testid="button-confirm-close-funding"
            >
              Yes, Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
