"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { Shield, CheckCircle2, Clock } from "lucide-react";

export function BrandClaimButton({ slug }: { slug: string }) {
  const { user } = useAuth();
  const [claimState, setClaimState] = useState<"idle" | "loading" | "verified" | "pending" | "error" | "already_claimed">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!user) return;
    fetch("/api/v1/brands/claims/mine")
      .then(r => r.json())
      .then(data => {
        const match = data.claims?.find((c: { brand_slug: string; status: string }) => c.brand_slug === slug);
        if (match) {
          if (match.status === "verified") setClaimState("verified");
          else if (match.status === "pending") setClaimState("pending");
        }
      })
      .catch(() => {});
  }, [user, slug]);

  const handleClaim = useCallback(async () => {
    setClaimState("loading");
    setErrorMsg("");
    try {
      const res = await fetch(`/api/v1/brands/${slug}/claim`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "already_claimed") { setClaimState("already_claimed"); return; }
        setClaimState("error");
        setErrorMsg(data.message || "Claim failed");
        return;
      }
      setClaimState(data.claim?.status === "verified" ? "verified" : "pending");
    } catch {
      setClaimState("error");
      setErrorMsg("Network error");
    }
  }, [slug]);

  if (!user) {
    return (
      <Link href="/login">
        <Button
          variant="ghost"
          size="sm"
          className="text-[11px] text-neutral-400 hover:text-primary rounded-full px-3 h-7"
          data-testid="button-claim-brand-login"
        >
          <Shield className="w-3 h-3 mr-1" />
          Claim this brand
        </Button>
      </Link>
    );
  }

  if (claimState === "verified") {
    return (
      <Link href="/overview">
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs border cursor-pointer hover:bg-emerald-200/60 transition-colors" data-testid="badge-claim-verified">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Claimed
        </Badge>
      </Link>
    );
  }

  if (claimState === "pending") {
    return (
      <Link href="/overview">
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs border cursor-pointer hover:bg-amber-200/60 transition-colors" data-testid="badge-claim-pending">
          <Clock className="w-3 h-3 mr-1" /> Claim Pending
        </Badge>
      </Link>
    );
  }

  if (claimState === "already_claimed") {
    return (
      <Badge className="bg-neutral-100 text-neutral-500 border-neutral-200 text-xs border" data-testid="badge-claim-taken">
        Already Claimed
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        className="text-[11px] text-neutral-400 hover:text-primary rounded-full px-3 h-7"
        onClick={handleClaim}
        disabled={claimState === "loading"}
        data-testid="button-claim-brand"
      >
        <Shield className="w-3 h-3 mr-1" />
        {claimState === "loading" ? "Claiming..." : "Claim this brand"}
      </Button>
      {claimState === "error" && <span className="text-xs text-red-500" data-testid="text-claim-error">{errorMsg}</span>}
    </div>
  );
}
