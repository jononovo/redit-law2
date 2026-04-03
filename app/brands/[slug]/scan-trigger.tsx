"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCw, Search } from "lucide-react";

interface BrandScanTriggerProps {
  domain: string;
  slug: string;
  variant?: "primary" | "secondary";
}

export function BrandScanTrigger({ domain, slug, variant = "primary" }: BrandScanTriggerProps) {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScan = useCallback(async () => {
    setScanning(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Scan failed. Please try again.");
        setScanning(false);
        return;
      }

      setScanning(false);
      router.refresh();
    } catch {
      setError("Could not connect to the scanner. Please try again.");
      setScanning(false);
    }
  }, [domain, router]);

  if (variant === "secondary") {
    return (
      <div>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl border border-neutral-200 bg-white text-sm font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors disabled:opacity-50"
          data-testid="button-rescan"
        >
          {scanning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Re-scanning...
            </>
          ) : (
            <>
              <RotateCw className="w-3.5 h-3.5" />
              Re-scan
            </>
          )}
        </button>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <Button
        onClick={handleScan}
        disabled={scanning}
        className="rounded-xl h-12 px-8 bg-primary text-white hover:bg-primary/90 font-bold shadow-lg shadow-primary/20 text-base disabled:opacity-50"
        data-testid="button-scan-brand"
      >
        {scanning ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Scanning {domain}...
          </>
        ) : (
          <>
            <Search className="w-4 h-4 mr-2" />
            Scan now
          </>
        )}
      </Button>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}
