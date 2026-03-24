"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import {
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Shield,
  Mail,
  Globe,
} from "lucide-react";

interface PendingClaim {
  id: number;
  brand_slug: string;
  brand_name: string;
  brand_domain: string | null;
  claimer_uid: string;
  claimer_email: string;
  email_domain: string;
  domain_matches: boolean;
  claim_type: string;
  status: string;
  created_at: string;
}

export default function AdminBrandClaimsPage() {
  const { user, loading } = useAuth();
  const [claims, setClaims] = useState<PendingClaim[]>([]);
  const [fetching, setFetching] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    if (loading || !user) return;
    fetch("/api/v1/brands/claims/review")
      .then(r => r.json())
      .then(data => setClaims(data.claims ?? []))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [user, loading]);

  const handleVerify = useCallback(async (claimId: number) => {
    setProcessing(claimId);
    try {
      const res = await fetch(`/api/v1/brands/claims/${claimId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify" }),
      });
      if (res.ok) {
        setClaims(prev => prev.filter(c => c.id !== claimId));
      }
    } catch {}
    setProcessing(null);
  }, []);

  const handleReject = useCallback(async () => {
    if (!rejectId || !rejectReason.trim()) return;
    setProcessing(rejectId);
    try {
      const res = await fetch(`/api/v1/brands/claims/${rejectId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reason: rejectReason.trim() }),
      });
      if (res.ok) {
        setClaims(prev => prev.filter(c => c.id !== rejectId));
      }
    } catch {}
    setProcessing(null);
    setRejectId(null);
    setRejectReason("");
  }, [rejectId, rejectReason]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <main className="py-32 text-center text-neutral-500">{loading ? "Loading..." : "Admin access required."}</main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-neutral-900 font-sans">
      <Nav />
      <main className="container mx-auto px-6 py-12">
        <Link
          href="/admin123"
          className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 hover:text-primary transition-colors mb-8"
          data-testid="link-back-admin"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Admin
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-extrabold" data-testid="text-page-title">Brand Claim Review</h1>
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs border" data-testid="badge-pending-count">
            {claims.length} pending
          </Badge>
        </div>

        {fetching ? (
          <div className="text-neutral-500 py-12 text-center">Loading claims...</div>
        ) : claims.length === 0 ? (
          <div className="border border-dashed border-neutral-200 rounded-xl py-16 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-300 mx-auto mb-4" />
            <p className="text-neutral-500 font-medium">No pending claims to review</p>
          </div>
        ) : (
          <div className="space-y-4">
            {claims.map(claim => (
              <div
                key={claim.id}
                className="border border-neutral-200 rounded-xl p-5"
                data-testid={`card-review-${claim.id}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-neutral-50 border border-neutral-100 flex items-center justify-center text-lg font-bold text-neutral-400">
                      {claim.brand_name[0]}
                    </div>
                    <div>
                      <Link href={`/skills/${claim.brand_slug}`} className="font-semibold hover:text-primary transition-colors" data-testid={`link-review-brand-${claim.brand_slug}`}>
                        {claim.brand_name}
                      </Link>
                      <div className="text-xs text-neutral-400 mt-0.5">
                        {new Date(claim.created_at).toLocaleDateString()} &middot; {claim.claim_type}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                      onClick={() => handleVerify(claim.id)}
                      disabled={processing === claim.id}
                      data-testid={`button-verify-${claim.id}`}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Verify
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => { setRejectId(claim.id); setRejectReason(""); }}
                      disabled={processing === claim.id}
                      data-testid={`button-reject-${claim.id}`}
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-neutral-500">
                    <Mail className="w-4 h-4" />
                    <span>{claim.claimer_email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-500">
                    <Globe className="w-4 h-4" />
                    <span>{claim.brand_domain ?? "No domain set"}</span>
                  </div>
                </div>

                <div className="mt-2">
                  {claim.domain_matches ? (
                    <Badge className="bg-green-100 text-green-700 border-green-200 text-xs border" data-testid={`badge-domain-match-${claim.id}`}>
                      Domain matches
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs border" data-testid={`badge-domain-mismatch-${claim.id}`}>
                      Domain mismatch
                    </Badge>
                  )}
                </div>

                {rejectId === claim.id && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-lg" data-testid={`form-reject-${claim.id}`}>
                    <label className="text-sm font-medium text-red-700 block mb-2">Rejection Reason</label>
                    <textarea
                      className="w-full border border-red-200 rounded-lg p-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-red-300"
                      rows={2}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Why is this claim being rejected?"
                      data-testid={`input-reject-reason-${claim.id}`}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="rounded-full bg-red-600 hover:bg-red-700 text-white text-xs"
                        onClick={handleReject}
                        disabled={!rejectReason.trim() || processing === claim.id}
                        data-testid={`button-confirm-reject-${claim.id}`}
                      >
                        Confirm Rejection
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full text-xs"
                        onClick={() => setRejectId(null)}
                        data-testid={`button-cancel-reject-${claim.id}`}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
