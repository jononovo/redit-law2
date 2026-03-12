"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";
import { useToast } from "@/hooks/use-toast";
import type { PaymentHandlerProps } from "../types";

type HandlerState = "initiating" | "verifying" | "success" | "error";

export function BasePayHandler({ context, onSuccess, onError, onCancel }: PaymentHandlerProps) {
  const { toast } = useToast();
  const [state, setState] = useState<HandlerState>("initiating");
  const [errorMessage, setErrorMessage] = useState("");
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const run = async () => {
      try {
        const { pay } = await import("@base-org/account");

        const result = await pay({
          amount: String(context.amountUsd),
          to: context.walletAddress,
        });

        if (!result || !result.id) {
          onCancel();
          return;
        }

        setState("verifying");

        let endpoint: string;
        let body: Record<string, unknown>;

        if (context.mode === "topup") {
          endpoint = "/api/v1/base-pay/verify";
          body = {
            tx_id: result.id,
            expected_amount: String(context.amountUsd),
            expected_recipient: context.walletAddress,
          };
        } else {
          endpoint = `/api/v1/checkout/${context.checkoutPageId}/pay/base-pay`;
          body = {
            tx_id: result.id,
            buyer_email: context.buyerEmail,
            buyer_name: context.buyerName,
            invoice_ref: context.invoiceRef,
          };
        }

        const fetchFn = context.mode === "topup" ? authFetch : fetch;
        const res = await fetchFn(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Verification failed");
        }

        const data = await res.json();

        setState("success");
        toast({
          title: "Payment successful!",
          description: context.mode === "topup"
            ? "USDC has been credited to your wallet."
            : "Your payment has been processed.",
        });

        setTimeout(() => {
          onSuccess({
            method: "base_pay",
            status: "completed",
            transactionId: data.transaction_id,
            newBalanceUsd: data.new_balance_usd,
            saleId: data.sale_id,
          });
        }, 1500);
      } catch (err) {
        const isEmptyObject = err != null && typeof err === "object" && !(err instanceof Error) && Object.keys(err).length === 0;
        if (isEmptyObject || err === null || err === undefined) {
          console.warn("[BasePayHandler] Payment dismissed by user");
          onCancel();
          return;
        }

        console.error("[BasePayHandler] Error:", err);

        let message: string;
        if (err instanceof Error) {
          message = err.message;
        } else if (typeof err === "object" && err !== null && "message" in err && typeof (err as any).message === "string") {
          message = (err as any).message;
        } else if (typeof err === "string") {
          message = err;
        } else {
          message = "Payment failed. Please try again.";
        }

        if (message.includes("rejected") || message.includes("cancelled") || message.includes("canceled") || message.includes("closed")) {
          onCancel();
          return;
        }

        setState("error");
        setErrorMessage(message);
        onError(message);
      }
    };

    run();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4" data-testid="base-pay-handler">
      {state === "initiating" && (
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-lg font-semibold text-neutral-900">Opening Base Pay...</p>
          <p className="text-sm text-neutral-500">Confirm the payment in your Base wallet</p>
        </div>
      )}

      {state === "verifying" && (
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-lg font-semibold text-neutral-900">Verifying payment...</p>
          <p className="text-sm text-neutral-500">Confirming your transaction on-chain</p>
        </div>
      )}

      {state === "success" && (
        <div className="flex flex-col items-center gap-4 text-center">
          <CheckCircle className="w-12 h-12 text-green-500" />
          <p className="text-lg font-semibold text-neutral-900">Payment complete!</p>
          <p className="text-sm text-neutral-500">
            ${context.amountUsd.toFixed(2)} USDC has been credited
          </p>
        </div>
      )}

      {state === "error" && (
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <p className="text-lg font-semibold text-neutral-900">Payment failed</p>
          <p className="text-sm text-neutral-500">{errorMessage}</p>
          <button
            onClick={onCancel}
            className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
            data-testid="button-base-pay-back"
          >
            Try a different method
          </button>
        </div>
      )}
    </div>
  );
}
