"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, CheckCircle, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { PaymentHandlerProps } from "../types";

const AUTO_POLL_INTERVAL_MS = 5_000;
const AUTO_POLL_DURATION_MS = 90_000;
const MANUAL_CHECK_COOLDOWN_MS = 5_000;

type QrState = "creating" | "waiting" | "checking" | "confirmed" | "error";

interface QrSession {
  paymentId: string;
  eip681Uri: string;
  walletAddress: string;
  amountUsdc: number;
  expiresAt: string;
}

export function QrWalletHandler({ context, onSuccess, onError, onCancel }: PaymentHandlerProps) {
  const { toast } = useToast();
  const [state, setState] = useState<QrState>("creating");
  const [session, setSession] = useState<QrSession | null>(null);
  const [autoPollActive, setAutoPollActive] = useState(true);
  const [lastCheckTime, setLastCheckTime] = useState(0);
  const [creditedAmount, setCreditedAmount] = useState<number | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoPollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    abortRef.current = abortController;

    createQrPayment(abortController.signal);

    return () => {
      abortController.abort();
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (autoPollTimeoutRef.current) clearTimeout(autoPollTimeoutRef.current);
    };
  }, []);

  const createQrPayment = async (signal: AbortSignal) => {
    try {
      const res = await fetch("/api/v1/qr-pay/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: context.walletAddress,
          amount_usd: context.amountUsd,
        }),
        signal,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create QR payment");
      }

      const data = await res.json();
      if (signal.aborted) return;

      const qrSession: QrSession = {
        paymentId: data.payment_id,
        eip681Uri: data.eip681_uri,
        walletAddress: data.wallet_address,
        amountUsdc: data.amount_usdc,
        expiresAt: data.expires_at,
      };

      setSession(qrSession);
      setState("waiting");
      startAutoPolling(qrSession.paymentId, signal);
    } catch (err) {
      if (signal.aborted) return;
      const message = err instanceof Error ? err.message : "Unknown error";
      setState("error");
      onError(message);
    }
  };

  const startAutoPolling = (paymentId: string, signal: AbortSignal) => {
    pollTimerRef.current = setInterval(() => {
      if (!signal.aborted) {
        checkStatus(paymentId);
      }
    }, AUTO_POLL_INTERVAL_MS);

    autoPollTimeoutRef.current = setTimeout(() => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      if (!signal.aborted) {
        setAutoPollActive(false);
      }
    }, AUTO_POLL_DURATION_MS);
  };

  const checkStatus = async (paymentId: string) => {
    try {
      const res = await fetch(`/api/v1/qr-pay/status/${paymentId}`);
      if (!res.ok) return;

      const data = await res.json();
      if (abortRef.current?.signal.aborted) return;

      setLastCheckTime(Date.now());

      if (data.status === "confirmed") {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        if (autoPollTimeoutRef.current) clearTimeout(autoPollTimeoutRef.current);

        setCreditedAmount(data.credited_usdc);
        setState("confirmed");

        setTimeout(() => {
          if (abortRef.current?.signal.aborted) return;
          onSuccess({
            method: "qr_wallet",
            status: "completed",
            transactionId: data.transaction_id,
            newBalanceUsd: data.new_balance_usd,
          });
        }, 2000);
      } else if (data.status === "expired") {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        if (autoPollTimeoutRef.current) clearTimeout(autoPollTimeoutRef.current);
        setState("error");
        onError("Payment expired. Please try again.");
      }
    } catch {
      // Silently continue polling on network errors
    }
  };

  const handleManualCheck = useCallback(() => {
    if (!session) return;

    const elapsed = Date.now() - lastCheckTime;
    if (elapsed < MANUAL_CHECK_COOLDOWN_MS) {
      toast({
        title: "Please wait",
        description: "Wait a few seconds before checking again.",
      });
      return;
    }

    setState("checking");
    checkStatus(session.paymentId).finally(() => {
      if (!abortRef.current?.signal.aborted && state !== "confirmed") {
        setState("waiting");
      }
    });
  }, [session, lastCheckTime, state, toast]);

  const handleCopyAddress = () => {
    if (!session) return;
    navigator.clipboard.writeText(session.walletAddress);
    toast({ title: "Address copied!" });
  };

  const handleCopyUri = () => {
    if (!session) return;
    navigator.clipboard.writeText(session.eip681Uri);
    toast({ title: "Payment link copied!" });
  };

  if (state === "creating") {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4" data-testid="qr-handler-creating">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
        <p className="text-sm text-neutral-500">Preparing payment...</p>
      </div>
    );
  }

  if (state === "confirmed") {
    const creditedUsd = creditedAmount ? creditedAmount / 1_000_000 : 0;
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4" data-testid="qr-handler-confirmed">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-lg font-bold text-neutral-900">Payment Received!</h3>
        <p className="text-2xl font-bold text-emerald-600">
          +${creditedUsd.toFixed(2)} USDC
        </p>
        <p className="text-sm text-neutral-500">
          Your wallet has been credited.
        </p>
      </div>
    );
  }

  if (state === "error" || !session) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4" data-testid="qr-handler-error">
        <AlertTriangle className="w-8 h-8 text-red-500" />
        <p className="text-sm text-neutral-500">Something went wrong. Please try again.</p>
        <Button variant="outline" onClick={onCancel} data-testid="button-qr-back">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-6 py-4" data-testid="qr-handler-waiting">
      <div className="text-center space-y-1">
        <h3 className="text-lg font-bold text-neutral-900">Send USDC on Base</h3>
        <p className="text-sm text-neutral-500">
          Scan QR or copy address below
        </p>
      </div>

      <div className="bg-white border-2 border-neutral-200 rounded-2xl p-4">
        <QRCodeSVG
          value={session.eip681Uri}
          size={200}
          level="M"
          includeMargin
          data-testid="qr-code-image"
        />
      </div>

      <div className="w-full max-w-xs space-y-3">
        <div className="bg-neutral-50 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Wallet Address</span>
            <button
              onClick={handleCopyAddress}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 cursor-pointer"
              data-testid="button-copy-qr-address"
            >
              <Copy className="w-3 h-3" /> Copy
            </button>
          </div>
          <code className="text-xs font-mono text-neutral-700 break-all leading-relaxed block">
            {session.walletAddress}
          </code>
        </div>

        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>USDC on Base network only.</strong> Other tokens or networks won't be detected and your wallet won't be credited.
          </p>
        </div>
      </div>

      <div className="w-full max-w-xs space-y-2">
        {autoPollActive ? (
          <div className="flex items-center justify-center gap-2 text-sm text-neutral-400 py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Watching for payment...</span>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full cursor-pointer"
            onClick={handleManualCheck}
            disabled={state === "checking"}
            data-testid="button-check-payment"
          >
            {state === "checking" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Check for Receipt
              </>
            )}
          </Button>
        )}

        <div className="flex justify-center">
          <Button
            variant="ghost"
            className="text-neutral-500 cursor-pointer"
            onClick={handleCopyUri}
            data-testid="button-copy-qr-uri"
          >
            <Copy className="w-4 h-4 mr-1" />
            EIP-681 URI
          </Button>
        </div>
      </div>
    </div>
  );
}
