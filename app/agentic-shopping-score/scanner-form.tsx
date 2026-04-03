"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Search, Loader2, ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { ScanProgress } from "@/components/scan-progress";
import { useDomainScan } from "@/hooks/use-domain-scan";

export function ScannerForm() {
  const router = useRouter();
  const scan = useDomainScan();

  useEffect(() => {
    if (scan.status === "done" && scan.result) {
      const timer = setTimeout(() => {
        router.push(`/brands/${scan.result!.slug}`);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [scan.status, scan.result, router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && scan.status !== "scanning") {
      scan.triggerScan();
    }
  };

  if (scan.status === "done" && scan.result) {
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
          href={`/brands/${scan.result.slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          data-testid="link-results-page"
        >
          creditclaw.com/brands/{scan.result.slug}
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
          value={scan.domain}
          onChange={(e) => scan.setDomain(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter your store domain..."
          disabled={scan.status === "scanning"}
          className="w-full h-14 pl-12 pr-32 rounded-2xl border border-neutral-200 bg-white text-base font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 disabled:opacity-60 shadow-sm transition-all"
          data-testid="input-domain"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <Button
            onClick={() => scan.triggerScan()}
            disabled={!scan.domain.trim() || scan.status === "scanning"}
            className="rounded-xl h-10 px-5 bg-primary text-white hover:bg-primary/90 font-bold shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none"
            data-testid="button-scan"
          >
            {scan.status === "scanning" ? (
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

      <ScanProgress
        status={scan.status}
        currentStage={scan.currentStage}
        errorMessage={scan.errorMsg}
      />

      {scan.status === "idle" && (
        <p className="mt-6 text-xs text-neutral-400 font-medium" data-testid="text-examples">
          Try: staples.com, amazon.com, shopify.com
        </p>
      )}
    </div>
  );
}
