"use client";

// Mounts the Crossmint browser SDK provider for Rail-3 surfaces (setup wizard,
// AddCardDialog). Bridges Firebase auth → Crossmint by calling setJwt() with the
// owner's Firebase ID token whenever it refreshes. The token is what Crossmint
// uses to scope user-locator backed operations from the browser.

import { useEffect, type ReactNode } from "react";
import { CrossmintProvider, useCrossmint } from "@crossmint/client-sdk-react-ui";
import { auth } from "@/features/platform-management/firebase/client";
import { RAIL3_CROSSMINT_CLIENT_API_KEY as CROSSMINT_CLIENT_API_KEY } from "@/features/payment-rails/crossmint-env";

function FirebaseJwtBridge() {
  const { setJwt } = useCrossmint();

  useEffect(() => {
    let cancelled = false;

    async function syncOnce() {
      try {
        const u = auth.currentUser;
        if (!u) { setJwt(undefined); return; }
        const token = await u.getIdToken();
        if (!cancelled) setJwt(token);
      } catch {
        if (!cancelled) setJwt(undefined);
      }
    }

    syncOnce();
    const unsub = auth.onIdTokenChanged(() => { syncOnce(); });
    // Firebase ID tokens expire after 1h; force-refresh every 50 minutes.
    const interval = setInterval(async () => {
      const u = auth.currentUser;
      if (!u) return;
      try {
        const token = await u.getIdToken(true);
        if (!cancelled) setJwt(token);
      } catch {}
    }, 50 * 60 * 1000);

    return () => { cancelled = true; unsub(); clearInterval(interval); };
  }, [setJwt]);

  return null;
}

export function Rail3CrossmintProvider({ children }: { children: ReactNode }) {
  const apiKey = CROSSMINT_CLIENT_API_KEY;
  if (!apiKey) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
        Crossmint client API key not configured. Set the env var referenced in <code className="font-mono">features/payment-rails/crossmint-env.ts</code>.
      </div>
    );
  }
  return (
    <CrossmintProvider apiKey={apiKey}>
      <FirebaseJwtBridge />
      {children}
    </CrossmintProvider>
  );
}

// Re-export so consumers can grab the live JWT from the same provider context.
export function useCrossmintJwt() {
  const { crossmint } = useCrossmint();
  return crossmint.jwt;
}
