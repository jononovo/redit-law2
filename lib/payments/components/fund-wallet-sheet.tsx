"use client";

import { useState, useCallback } from "react";
import { DollarSign, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { getAvailableMethods } from "../methods";
import { PaymentMethodSelector } from "./payment-method-selector";
import { StripeOnrampHandler } from "../handlers/stripe-onramp-handler";
import { BasePayHandler } from "../handlers/base-pay-handler";
import { QrWalletHandler } from "../handlers/qr-wallet-handler";
import type { PaymentContext, PaymentResult } from "../types";

type SheetState = "select" | "paying";

interface FundWalletSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletId: number;
  walletAddress: string;
  botName?: string;
  rail: "rail1" | "rail2";
  onSuccess: () => void;
}

export function FundWalletSheet({
  open,
  onOpenChange,
  walletId,
  walletAddress,
  botName,
  rail,
  onSuccess,
}: FundWalletSheetProps) {
  const { toast } = useToast();
  const [sheetState, setSheetState] = useState<SheetState>("select");
  const [activeMethod, setActiveMethod] = useState<string | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [amount, setAmount] = useState("25.00");

  const methods = getAvailableMethods(rail, "topup");

  const walletDisplayName = botName && botName !== "Unknown Bot" ? botName : null;
  const title = walletDisplayName ? `Fund "${walletDisplayName}"` : "Fund Wallet";

  const handleClose = useCallback(() => {
    if (sheetState === "paying" && (activeMethod === "stripe_onramp" || activeMethod === "qr_wallet")) {
      setShowCloseConfirm(true);
      return;
    }
    resetAndClose();
  }, [sheetState, activeMethod]);

  const resetAndClose = useCallback(() => {
    setSheetState("select");
    setActiveMethod(null);
    setShowCloseConfirm(false);
    setAmount("25.00");
    onOpenChange(false);
  }, [onOpenChange]);

  const handleMethodSelect = (methodId: string) => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed < 1 || parsed > 10000) {
      toast({
        title: "Invalid amount",
        description: "Please enter an amount between $1 and $10,000",
        variant: "destructive",
      });
      return;
    }
    setActiveMethod(methodId);
    setSheetState("paying");
  };

  const buildContext = (): PaymentContext => ({
    mode: "topup",
    rail,
    amountUsd: parseFloat(amount),
    walletAddress,
    walletId,
    botName,
  });

  const handlePaymentSuccess = useCallback((_result: PaymentResult) => {
    onSuccess();
    setTimeout(() => {
      resetAndClose();
    }, 2000);
  }, [onSuccess, resetAndClose]);

  const handlePaymentError = useCallback((error: string) => {
    toast({ title: "Payment failed", description: error, variant: "destructive" });
    setSheetState("select");
    setActiveMethod(null);
  }, [toast]);

  const handlePaymentCancel = useCallback(() => {
    setSheetState("select");
    setActiveMethod(null);
  }, []);

  const renderHandler = () => {
    if (!activeMethod) return null;
    const ctx = buildContext();

    switch (activeMethod) {
      case "stripe_onramp":
        return (
          <StripeOnrampHandler
            context={ctx}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            onCancel={handlePaymentCancel}
          />
        );
      case "base_pay":
        return (
          <BasePayHandler
            context={ctx}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            onCancel={handlePaymentCancel}
          />
        );
      case "qr_wallet":
        return (
          <QrWalletHandler
            context={ctx}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            onCancel={handlePaymentCancel}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(openState) => {
          if (!openState) handleClose();
        }}
      >
        <SheetContent
          side="right"
          size="lg"
          overlayTitle={title}
          overlayDescription="Fund your USDC wallet on CreditClaw."
          overlayExtra={
            <div className="mt-6 space-y-4 max-w-xs mx-auto">
              <div>
                <p className="text-sm text-white/70 font-semibold mb-2">Wallet Address</p>
                <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                  <code
                    className="text-sm text-white/70 font-mono truncate flex-1"
                    data-testid="text-fund-wallet-address"
                  >
                    {walletAddress}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(walletAddress);
                      toast({ title: "Wallet address copied!" });
                    }}
                    className="text-white/70 hover:text-white transition-colors flex-shrink-0 cursor-pointer"
                    data-testid="button-copy-fund-address"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
                {activeMethod === "stripe_onramp" && (
                  <p className="text-sm text-white/70 mt-2 leading-relaxed">
                    You will need to paste your wallet address when funding for the first time. Copy it from here.
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                className="w-full border-white/30 text-white/70 hover:bg-white/10 hover:text-white cursor-pointer"
                onClick={handleClose}
                data-testid="button-close-funding"
              >
                Close
              </Button>
            </div>
          }
          className="overflow-y-auto p-0"
          data-testid="drawer-fund-wallet"
          onInteractOutside={(e) => {
            if (sheetState === "paying") e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (sheetState === "paying") e.preventDefault();
          }}
        >
          <SheetTitle className="sr-only">{title}</SheetTitle>
          <SheetDescription className="sr-only">
            Fund your USDC wallet on CreditClaw.
          </SheetDescription>

          <div className="p-6 md:hidden border-b border-border">
            <div className="flex items-center gap-2 pr-8">
              <DollarSign className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Fund your USDC wallet on CreditClaw.
            </p>
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-1">Wallet Address</p>
              <div className="flex items-center gap-2 bg-neutral-100 rounded-lg px-3 py-2">
                <code className="text-xs font-mono truncate flex-1">{walletAddress}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(walletAddress);
                    toast({ title: "Wallet address copied!" });
                  }}
                  className="text-neutral-400 hover:text-neutral-700 transition-colors flex-shrink-0 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {sheetState === "select" && (
              <div className="max-w-sm mx-auto space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 mb-1">
                    Fund Wallet
                  </h3>
                  <p className="text-sm text-neutral-500">
                    Enter amount and choose how to pay.
                  </p>
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-neutral-400">
                    $
                  </span>
                  <Input
                    type="number"
                    min="1"
                    max="10000"
                    step="1"
                    placeholder="25.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-10 pr-20 text-2xl font-bold h-16 rounded-xl text-neutral-700"
                    data-testid="input-fund-amount"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-neutral-400 font-semibold">
                    USD
                  </span>
                </div>

                <PaymentMethodSelector
                  methods={methods}
                  onSelect={handleMethodSelect}
                />
              </div>
            )}

            {sheetState === "paying" && (
              <div className="min-h-[500px]">
                {renderHandler()}
              </div>
            )}
          </div>

          {sheetState !== "paying" && (
            <div className="p-4 border-t border-border md:hidden">
              <Button
                variant="outline"
                className="w-full cursor-pointer"
                onClick={handleClose}
                data-testid="button-close-funding-mobile"
              >
                Close
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={showCloseConfirm}
        onOpenChange={(openState) => {
          if (!openState) setShowCloseConfirm(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              Close funding?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to close? You may lose your progress in the current payment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-close-funding">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={resetAndClose}
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
