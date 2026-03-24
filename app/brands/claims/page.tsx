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
  Clock,
  XCircle,
  ArrowLeft,
  Shield,
  AlertTriangle,
} from "lucide-react";

interface ClaimRow {
  id: number;
  brand_slug: string;
  brand_name: string;
  brand_domain: string | null;
  claimer_email: string;
  claim_type: string;
  status: string;
  rejection_reason: string | null;
  verified_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; badge: string }> = {
  verified: { icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />, badge: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  pending: { icon: <Clock className="w-4 h-4 text-amber-600" />, badge: "bg-amber-100 text-amber-700 border-amber-200" },
  rejected: { icon: <XCircle className="w-4 h-4 text-red-500" />, badge: "bg-red-100 text-red-700 border-red-200" },
  revoked: { icon: <AlertTriangle className="w-4 h-4 text-neutral-400" />, badge: "bg-neutral-100 text-neutral-500 border-neutral-200" },
};

export default function MyClaimsPage() {
  const { user, loading } = useAuth();
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [revoking, setRevoking] = useState<number | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    fetch("/api/v1/brands/claims/mine")
      .then(r => r.json())
      .then(data => setClaims(data.claims ?? []))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [user, loading]);

  const handleRevoke = useCallback(async (claimId: number) => {
    if (!confirm("Are you sure you want to revoke this claim? The brand will revert to community maturity.")) return;
    setRevoking(claimId);
    try {
      const res = await fetch(`/api/v1/brands/claims/${claimId}/revoke`, { method: "POST" });
      if (res.ok) {
        setClaims(prev => prev.map(c => c.id === claimId ? { ...c, status: "revoked", revoked_at: new Date().toISOString() } : c));
      }
    } catch {}
    setRevoking(null);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <main className="py-32 text-center text-neutral-500">Loading...</main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <main className="py-32 text-center">
          <p className="text-neutral-500 mb-4">Sign in to view your brand claims.</p>
          <Link href="/login">
            <Button className="rounded-full" data-testid="button-login">Sign In</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-neutral-900 font-sans">
      <Nav />
      <main className="container mx-auto px-6 py-12">
        <Link
          href="/skills"
          className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 hover:text-primary transition-colors mb-8"
          data-testid="link-back-catalog"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Skills Catalog
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-extrabold" data-testid="text-page-title">My Brand Claims</h1>
        </div>

        {fetching ? (
          <div className="text-neutral-500 py-12 text-center">Loading claims...</div>
        ) : claims.length === 0 ? (
          <div className="border border-dashed border-neutral-200 rounded-xl py-16 text-center">
            <Shield className="w-10 h-10 text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-500 font-medium mb-2">No brand claims yet</p>
            <p className="text-sm text-neutral-400 mb-6">
              Visit a brand's detail page in the Skills Catalog to claim ownership.
            </p>
            <Link href="/skills">
              <Button variant="outline" className="rounded-full" data-testid="button-browse-skills">
                Browse Skills
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {claims.map(claim => {
              const cfg = STATUS_CONFIG[claim.status] ?? STATUS_CONFIG.pending;
              return (
                <div
                  key={claim.id}
                  className="border border-neutral-200 rounded-xl p-5 flex items-center justify-between"
                  data-testid={`card-claim-${claim.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-neutral-50 border border-neutral-100 flex items-center justify-center text-lg font-bold text-neutral-400">
                      {claim.brand_name[0]}
                    </div>
                    <div>
                      <Link href={`/skills/${claim.brand_slug}`} className="font-semibold hover:text-primary transition-colors" data-testid={`link-brand-${claim.brand_slug}`}>
                        {claim.brand_name}
                      </Link>
                      <div className="text-xs text-neutral-400 mt-0.5">
                        Claimed as {claim.claimer_email} &middot; {new Date(claim.created_at).toLocaleDateString()}
                      </div>
                      {claim.status === "rejected" && claim.rejection_reason && (
                        <div className="text-xs text-red-500 mt-1">
                          Reason: {claim.rejection_reason}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={`text-xs border ${cfg.badge}`} data-testid={`badge-status-${claim.id}`}>
                      {cfg.icon}
                      <span className="ml-1 capitalize">{claim.status}</span>
                    </Badge>
                    {claim.status === "verified" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRevoke(claim.id)}
                        disabled={revoking === claim.id}
                        data-testid={`button-revoke-${claim.id}`}
                      >
                        {revoking === claim.id ? "Revoking..." : "Revoke"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
