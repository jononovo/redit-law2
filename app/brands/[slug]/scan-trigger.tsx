"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCw, Search } from "lucide-react";
import { ScanProgress } from "@/components/scan-progress";
import { useDomainScan } from "@/hooks/use-domain-scan";

interface BrandScanTriggerProps {
  domain: string;
  slug: string;
  variant?: "primary" | "secondary";
}

export function BrandScanTrigger({ domain, slug, variant = "primary" }: BrandScanTriggerProps) {
  const router = useRouter();
  const scan = useDomainScan({ initialDomain: domain });

  useEffect(() => {
    if (scan.status === "done") {
      router.refresh();
    }
  }, [scan.status, router]);

  if (variant === "secondary") {
    return (
      <div>
        <button
          onClick={() => scan.triggerScan(domain)}
          disabled={scan.status === "scanning"}
          className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl border border-neutral-200 bg-white text-sm font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors disabled:opacity-50"
          data-testid="button-rescan"
        >
          {scan.status === "scanning" ? (
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
        <ScanProgress
          status={scan.status}
          currentStage={scan.currentStage}
          errorMessage={scan.errorMsg}
        />
      </div>
    );
  }

  return (
    <div>
      <Button
        onClick={() => scan.triggerScan(domain)}
        disabled={scan.status === "scanning"}
        className="rounded-xl h-12 px-8 bg-primary text-white hover:bg-primary/90 font-bold shadow-lg shadow-primary/20 text-base disabled:opacity-50"
        data-testid="button-scan-brand"
      >
        {scan.status === "scanning" ? (
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
      <ScanProgress
        status={scan.status}
        currentStage={scan.currentStage}
        errorMessage={scan.errorMsg}
      />
    </div>
  );
}
