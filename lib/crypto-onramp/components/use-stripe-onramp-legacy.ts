// LEGACY: This hook has been superseded by lib/payments/handlers/stripe-onramp-handler.tsx
// Retained for reference or potential reuse. No active pages import this file.

"use client";

import { useState, useRef, useCallback } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { useToast } from "@/hooks/use-toast";

export interface UseStripeOnrampConfig {
  apiEndpoint: string;
  onFundingComplete: () => void;
}

export interface OnrampWalletInfo {
  id: number;
  address: string;
  bot_name?: string;
}

export function useStripeOnramp({ apiEndpoint, onFundingComplete }: UseStripeOnrampConfig) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [wallet, setWallet] = useState<OnrampWalletInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const mountRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<any>(null);

  const loadScript = useCallback((src: string) => {
    return new Promise<void>((resolve, reject) => {
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
  }, []);

  const open = useCallback(async (target: OnrampWalletInfo) => {
    setWallet(target);
    setLoading(true);

    try {
      const res = await authFetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_id: target.id }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast({ title: "Error", description: err.error || "Failed to create onramp session", variant: "destructive" });
        setLoading(false);
        return;
      }

      const data = await res.json();
      const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

      const isInIframe = window.self !== window.top;
      console.log("[Onramp] Session ready:", { sessionId: data.session_id, hasClientSecret: !!data.client_secret, hasRedirectUrl: !!data.redirect_url, isInIframe });

      if (publishableKey && !isInIframe) {
        setIsOpen(true);

        try {
          await loadScript("https://js.stripe.com/clover/stripe.js");
          await loadScript("https://crypto-js.stripe.com/crypto-onramp-outer.js");

          const StripeOnramp = (window as any).StripeOnramp;
          if (!StripeOnramp) throw new Error("SDK not loaded");

          const stripeOnramp = StripeOnramp(publishableKey);
          const session = stripeOnramp.createSession({
            clientSecret: data.client_secret,
          });

          sessionRef.current = session;

          session.addEventListener("onramp_ui_loaded", () => {
            console.log("[Onramp] Widget UI loaded successfully");
          });

          session.addEventListener("onramp_session_updated", (e: any) => {
            const status = e?.payload?.session?.status;
            console.log("[Onramp] Session status:", status);
            if (status === "fulfillment_complete") {
              toast({ title: "Funding complete!", description: "USDC has been delivered to your wallet." });
              onFundingComplete();
            }
          });

          setTimeout(() => {
            if (mountRef.current) {
              session.mount(mountRef.current);
            } else {
              console.error("[Onramp] Mount ref is null");
            }
            setLoading(false);
          }, 100);
        } catch (embeddedErr) {
          console.error("[Onramp] Embedded widget failed:", embeddedErr);
          setIsOpen(false);
          if (data.redirect_url) {
            window.open(data.redirect_url, "_blank");
            toast({ title: "Opening Stripe", description: "Stripe onramp opened in a new tab." });
          } else {
            toast({ title: "Error", description: "Failed to load onramp widget", variant: "destructive" });
          }
          setLoading(false);
        }
      } else if (data.redirect_url) {
        window.open(data.redirect_url, "_blank");
        toast({ title: "Opening Stripe", description: "Stripe onramp opened in a new tab." });
        setLoading(false);
      } else {
        toast({ title: "Configuration needed", description: "Stripe publishable key is required for embedded onramp, and no hosted redirect is available.", variant: "destructive" });
        setLoading(false);
      }
    } catch (err) {
      console.error("Onramp error:", err);
      toast({ title: "Error", description: "Failed to initialize onramp", variant: "destructive" });
      setLoading(false);
    }
  }, [apiEndpoint, onFundingComplete, toast, loadScript]);

  const close = useCallback(() => {
    if (sessionRef.current) {
      try {
        sessionRef.current.destroy?.();
      } catch {}
      sessionRef.current = null;
    }
    setIsOpen(false);
    setWallet(null);
    setLoading(false);
  }, []);

  const requestClose = useCallback(() => {
    setShowCloseConfirm(true);
  }, []);

  const confirmClose = useCallback(() => {
    setShowCloseConfirm(false);
    close();
  }, [close]);

  const cancelClose = useCallback(() => {
    setShowCloseConfirm(false);
  }, []);

  return {
    isOpen,
    wallet,
    loading,
    showCloseConfirm,
    mountRef,
    open,
    close,
    requestClose,
    confirmClose,
    cancelClose,
  };
}
