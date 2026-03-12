"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";
import { useToast } from "@/hooks/use-toast";
import type { PaymentHandlerProps } from "../types";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function waitForRef(ref: React.RefObject<HTMLDivElement | null>, maxAttempts = 20): Promise<HTMLDivElement> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      if (ref.current) {
        resolve(ref.current);
        return;
      }
      attempts++;
      if (attempts >= maxAttempts) {
        reject(new Error("Mount element not available"));
        return;
      }
      requestAnimationFrame(check);
    };
    check();
  });
}

export function StripeOnrampHandler({ context, onSuccess, onError, onCancel }: PaymentHandlerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const mountRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<any>(null);
  const initRef = useRef(false);

  const cleanup = useCallback(() => {
    if (sessionRef.current) {
      try {
        sessionRef.current.destroy?.();
      } catch {}
      sessionRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      try {
        let endpoint: string;
        let body: Record<string, unknown>;

        if (context.mode === "topup") {
          endpoint = "/api/v1/stripe-wallet/onramp/session";
          body = { wallet_id: context.walletId };
        } else {
          endpoint = `/api/v1/checkout/${context.checkoutPageId}/pay/stripe-onramp`;
          body = {};
          if (context.amountUsd) body.amount_usd = context.amountUsd;
          if (context.invoiceRef) body.invoice_ref = context.invoiceRef;
          if (context.buyerName) body.buyer_name = context.buyerName;
        }

        const fetchFn = context.mode === "topup" ? authFetch : fetch;
        const res = await fetchFn(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          onError(err.error || "Failed to create payment session");
          return;
        }

        const data = await res.json();
        const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

        let isInIframe = false;
        try {
          isInIframe = window.self !== window.top;
        } catch {
          isInIframe = true;
        }

        if (publishableKey && !isInIframe) {
          try {
            await loadScript("https://js.stripe.com/clover/stripe.js");
            await loadScript("https://crypto-js.stripe.com/crypto-onramp-outer.js");

            const StripeOnramp = (window as any).StripeOnramp;
            if (!StripeOnramp) throw new Error("Stripe SDK not loaded");

            const stripeOnramp = StripeOnramp(publishableKey);
            const session = stripeOnramp.createSession({
              clientSecret: data.client_secret,
            });

            sessionRef.current = session;

            session.addEventListener("onramp_ui_loaded", () => {
              setLoading(false);
            });

            session.addEventListener("onramp_session_updated", (e: any) => {
              const status = e?.payload?.session?.status;
              if (status === "fulfillment_complete") {
                toast({
                  title: "Payment successful!",
                  description: context.mode === "topup"
                    ? "USDC has been delivered to your wallet."
                    : "Your payment has been processed.",
                });
                onSuccess({ method: "stripe_onramp", status: "completed" });
              }
            });

            const el = await waitForRef(mountRef);
            session.mount(el);
            setLoading(false);
          } catch (embeddedErr) {
            console.error("[StripeHandler] Embedded widget failed:", embeddedErr);
            cleanup();
            if (data.redirect_url) {
              window.open(data.redirect_url, "_blank");
              toast({ title: "Opening Stripe", description: "Payment opened in a new tab." });
              setLoading(false);
            } else {
              onError("Failed to load payment widget");
            }
          }
        } else if (data.redirect_url) {
          window.open(data.redirect_url, "_blank");
          toast({ title: "Opening Stripe", description: "Payment opened in a new tab." });
          setLoading(false);
        } else {
          onError("Payment method unavailable — missing configuration");
        }
      } catch (err) {
        console.error("[StripeHandler] Init error:", err);
        onError(err instanceof Error ? err.message : "Failed to initialize payment");
      }
    };

    init();

    return () => {
      cleanup();
    };
  }, []);

  const handleCancel = () => {
    cleanup();
    onCancel();
  };

  return (
    <div className="flex flex-col h-full" data-testid="stripe-onramp-handler">
      <div className="flex-1 relative min-h-[500px]">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm text-neutral-500">Loading payment...</p>
            </div>
          </div>
        )}
        <div ref={mountRef} className="w-full min-h-[500px]" data-testid="container-stripe-onramp" />
      </div>
    </div>
  );
}
