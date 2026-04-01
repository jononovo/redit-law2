"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Search, Loader2, ArrowRight, AlertCircle, ExternalLink } from "lucide-react";
import Link from "next/link";

type ScanState = "idle" | "scanning" | "redirecting" | "error";

interface ScanResult {
  domain: string;
  name: string;
  score: number;
  label: string;
  slug: string;
}

export function ScannerForm() {
  const router = useRouter();
  const [domain, setDomain] = useState("");
  const [state, setState] = useState<ScanState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);

  const handleScan = useCallback(async () => {
    const trimmed = domain.trim();
    if (!trimmed) return;

    setState("scanning");
    setError(null);

    try {
      const res = await fetch("/api/v1/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setState("error");
        setError(data.message || "Something went wrong. Please try again.");
        return;
      }

      const brandSlug = data.slug;
      setResult({ domain: data.domain, name: data.name, score: data.score, label: data.label, slug: brandSlug });
      setState("redirecting");

      setTimeout(() => {
        router.push(`/brands/${brandSlug}`);
      }, 2500);
    } catch {
      setState("error");
      setError("Could not connect to the scanner. Please try again.");
    }
  }, [domain, router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && state === "idle") {
      handleScan();
    }
  };

  if (state === "redirecting" && result) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-100 p-8 shadow-lg max-w-md mx-auto animate-fade-in-up" data-testid="card-redirecting">
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
            <ArrowRight className="w-7 h-7 text-green-600 animate-pulse" />
          </div>
        </div>
        <h3 className="text-lg font-bold text-neutral-900 mb-2" data-testid="text-scan-complete">Scan complete!</h3>
        <p className="text-sm text-neutral-600 mb-4">
          Your results are ready. Taking you to:
        </p>
        <Link
          href={`/brands/${result.slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          data-testid="link-results-page"
        >
          creditclaw.com/brands/{result.slug}
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-neutral-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          Redirecting...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="relative" data-testid="input-group-domain">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter your store domain..."
          disabled={state === "scanning"}
          className="w-full h-14 pl-12 pr-32 rounded-2xl border border-neutral-200 bg-white text-base font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 disabled:opacity-60 shadow-sm transition-all"
          data-testid="input-domain"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <Button
            onClick={handleScan}
            disabled={!domain.trim() || state === "scanning"}
            className="rounded-xl h-10 px-5 bg-primary text-white hover:bg-primary/90 font-bold shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none"
            data-testid="button-scan"
          >
            {state === "scanning" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Scanning
              </>
            ) : (
              "Scan"
            )}
          </Button>
        </div>
      </div>

      {state === "scanning" && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-neutral-500 animate-fade-in-up" data-testid="text-scanning-status">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          Analyzing {domain.trim()}...
        </div>
      )}

      {state === "error" && error && (
        <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 animate-fade-in-up" data-testid="alert-scan-error">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-700 font-medium">{error}</p>
            <button
              onClick={() => { setState("idle"); setError(null); }}
              className="text-xs text-red-500 hover:text-red-700 font-semibold mt-1 underline"
              data-testid="button-retry"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-neutral-400 font-medium" data-testid="text-examples">
        Try: staples.com, amazon.com, shopify.com
      </p>
    </div>
  );
}
