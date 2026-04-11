"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

const TRUSTED_DOMAINS = [
  "creditclaw.com",
  "www.creditclaw.com",
  "brands.sh",
  "www.brands.sh",
  "shopy.sh",
  "www.shopy.sh",
  "localhost",
];

function isTrustedRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return TRUSTED_DOMAINS.some(
      (domain) => parsed.hostname === domain || parsed.hostname.endsWith(".replit.dev") || parsed.hostname.endsWith(".replit.app")
    );
  } catch {
    return false;
  }
}

export default function FirebaseAuthActionPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const mode = searchParams.get("mode");
    const oobCode = searchParams.get("oobCode");
    const apiKey = searchParams.get("apiKey");
    const continueUrl = searchParams.get("continueUrl");
    const lang = searchParams.get("lang");

    const fallback = window.location.origin + "/overview";

    if (!continueUrl || !isTrustedRedirectUrl(continueUrl)) {
      window.location.replace(fallback);
      return;
    }

    try {
      const redirectUrl = new URL(continueUrl);
      if (mode) redirectUrl.searchParams.set("mode", mode);
      if (oobCode) redirectUrl.searchParams.set("oobCode", oobCode);
      if (apiKey) redirectUrl.searchParams.set("apiKey", apiKey);
      if (lang) redirectUrl.searchParams.set("lang", lang);
      window.location.replace(redirectUrl.toString());
    } catch {
      window.location.replace(fallback);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-neutral-500 font-medium">Redirecting...</p>
      </div>
    </div>
  );
}
