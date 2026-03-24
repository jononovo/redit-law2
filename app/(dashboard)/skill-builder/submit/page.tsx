"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Search,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  Sparkles,
  Send,
  Award,
  Users,
  TrendingUp,
  Shield,
} from "lucide-react";

type Submission = {
  id: number;
  vendorUrl: string;
  vendorSlug: string | null;
  vendorName: string;
  status: string;
  submitterType: string;
  reviewNeeded: string[];
  confidence: Record<string, number>;
  createdAt: string;
  updatedAt: string;
};

type ClaimItem = {
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
};

type Profile = {
  skillsSubmitted: number;
  skillsPublished: number;
  skillsRejected: number;
} | null;

type UnifiedItem =
  | { kind: "submission"; data: Submission }
  | { kind: "claim"; data: ClaimItem };

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Under Review", color: "bg-amber-100 text-amber-700 border-amber-200", icon: <Clock className="w-3 h-3" /> },
  reviewed: { label: "Reviewed", color: "bg-blue-100 text-blue-700 border-blue-200", icon: <CheckCircle2 className="w-3 h-3" /> },
  published: { label: "Published", color: "bg-green-100 text-green-700 border-green-200", icon: <CheckCircle2 className="w-3 h-3" /> },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700 border-red-200", icon: <XCircle className="w-3 h-3" /> },
};

const CLAIM_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  verified: { label: "Verified", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3 h-3" /> },
  pending: { label: "Pending Review", color: "bg-amber-100 text-amber-700 border-amber-200", icon: <Clock className="w-3 h-3" /> },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700 border-red-200", icon: <XCircle className="w-3 h-3" /> },
  revoked: { label: "Revoked", color: "bg-neutral-100 text-neutral-500 border-neutral-200", icon: <XCircle className="w-3 h-3" /> },
};

function SubmissionCard({ sub, avgConfidence }: { sub: Submission; avgConfidence: (conf: Record<string, number>) => number }) {
  const statusInfo = STATUS_CONFIG[sub.status] || STATUS_CONFIG.pending;
  const conf = avgConfidence(sub.confidence);
  return (
    <div
      className="bg-white rounded-2xl border border-neutral-200 p-5 transition-all"
      data-testid={`submission-${sub.id}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base" data-testid={`text-submission-name-${sub.id}`}>
                {sub.vendorName}
              </h3>
              {sub.submitterType === "official" ? (
                <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] font-semibold flex items-center gap-0.5">
                  <Award className="w-3 h-3" />
                  Official
                </Badge>
              ) : (
                <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[10px] font-semibold flex items-center gap-0.5">
                  <Users className="w-3 h-3" />
                  Community
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-neutral-400">{sub.vendorUrl}</span>
              <ExternalLink className="w-3 h-3 text-neutral-400" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {sub.reviewNeeded.length > 0 && sub.status === "pending" && (
            <span className="text-xs text-amber-600 font-medium">
              {sub.reviewNeeded.length} fields need review
            </span>
          )}
          <div className="text-right">
            <div className={`text-sm font-bold ${conf >= 80 ? "text-green-600" : conf >= 60 ? "text-amber-600" : "text-red-600"}`}>
              {conf}%
            </div>
            <div className="text-[10px] text-neutral-400 uppercase tracking-wider">confidence</div>
          </div>
          <Badge className={`${statusInfo.color} border text-xs font-medium flex items-center gap-1`}>
            {statusInfo.icon}
            {statusInfo.label}
          </Badge>
        </div>
      </div>
      <div className="mt-2 text-[11px] text-neutral-400">
        Submitted {new Date(sub.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}

function ClaimCard({ claim, onRevoke, revoking }: { claim: ClaimItem; onRevoke: (id: number) => void; revoking: number | null }) {
  const claimStatus = CLAIM_STATUS_CONFIG[claim.status] || CLAIM_STATUS_CONFIG.pending;
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-5 transition-all" data-testid={`claim-${claim.id}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-lg font-bold text-emerald-400">
            {claim.brand_name[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Link href={`/skills/${claim.brand_slug}`}>
                <h3 className="font-bold text-base hover:text-primary transition-colors" data-testid={`text-claim-name-${claim.id}`}>
                  {claim.brand_name}
                </h3>
              </Link>
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-semibold flex items-center gap-0.5">
                <Shield className="w-3 h-3" />
                {claim.claim_type === "domain_match" ? "Domain Match" : "Manual Review"}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-neutral-400">{claim.claimer_email}</span>
              {claim.brand_domain && (
                <>
                  <span className="text-xs text-neutral-300">&middot;</span>
                  <span className="text-xs text-neutral-400">{claim.brand_domain}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {claim.status === "rejected" && claim.rejection_reason && (
            <span className="text-xs text-red-500 max-w-[200px] truncate">{claim.rejection_reason}</span>
          )}
          <Badge className={`${claimStatus.color} border text-xs font-medium flex items-center gap-1`}>
            {claimStatus.icon}
            {claimStatus.label}
          </Badge>
          {claim.status === "verified" && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => onRevoke(claim.id)}
              disabled={revoking === claim.id}
              data-testid={`button-revoke-${claim.id}`}
            >
              {revoking === claim.id ? "Revoking..." : "Revoke"}
            </Button>
          )}
        </div>
      </div>
      <div className="mt-2 text-[11px] text-neutral-400">
        Claimed {new Date(claim.created_at).toLocaleDateString()}
      </div>
    </div>
  );
}

export default function MySkillsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [claims, setClaims] = useState<ClaimItem[]>([]);
  const [profile, setProfile] = useState<Profile>(null);
  const [loading, setLoading] = useState(true);
  const [submitUrl, setSubmitUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<number | null>(null);

  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimSlug, setClaimSlug] = useState("");
  const [claimSearchResults, setClaimSearchResults] = useState<{ slug: string; name: string }[]>([]);
  const [claimSearching, setClaimSearching] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);
  const searchTimer = useRef<NodeJS.Timeout | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subRes, claimRes] = await Promise.all([
        fetch("/api/v1/skills/submissions/mine"),
        fetch("/api/v1/brands/claims/mine"),
      ]);
      if (subRes.ok) {
        const data = await subRes.json();
        setSubmissions(data.submissions || []);
        setProfile(data.profile);
      }
      if (claimRes.ok) {
        const claimData = await claimRes.json();
        setClaims(claimData.claims || []);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async () => {
    if (!submitUrl.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);
    try {
      const res = await fetch("/api/v1/skills/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: submitUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.message || "Submission failed");
      } else {
        setSubmitUrl("");
        setSubmitSuccess(data.message);
        fetchData();
      }
    } catch {
      setSubmitError("Network error — please try again");
    }
    setSubmitting(false);
  };

  const handleRevoke = useCallback(async (claimId: number) => {
    if (!confirm("Are you sure you want to revoke this claim? The brand will revert to community maturity.")) return;
    setRevoking(claimId);
    try {
      const res = await fetch(`/api/v1/brands/claims/${claimId}/revoke`, { method: "POST" });
      if (res.ok) {
        setClaims(prev => prev.map(c =>
          c.id === claimId ? { ...c, status: "revoked", revoked_at: new Date().toISOString() } : c
        ));
      }
    } catch {}
    setRevoking(null);
  }, []);

  const handleClaimSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setClaimSlug(q);
    setClaimError(null);
    setClaimSuccess(null);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (q.trim().length < 2) {
      setClaimSearchResults([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setClaimSearching(true);
      try {
        const res = await fetch(`/api/internal/brands/search?q=${encodeURIComponent(q.trim())}&limit=8`);
        if (res.ok) {
          const data = await res.json();
          setClaimSearchResults(
            (data.brands || []).slice(0, 8).map((b: { slug: string; name: string }) => ({
              slug: b.slug,
              name: b.name,
            }))
          );
        }
      } catch {}
      setClaimSearching(false);
    }, 300);
  };

  const handleClaimBrand = async (slug: string) => {
    setClaiming(true);
    setClaimError(null);
    setClaimSuccess(null);
    try {
      const res = await fetch(`/api/v1/brands/${slug}/claim`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setClaimError(data.message || "Claim failed");
      } else {
        setClaimSuccess(data.message);
        setClaimSearchResults([]);
        setClaimSlug("");
        fetchData();
      }
    } catch {
      setClaimError("Network error — please try again");
    }
    setClaiming(false);
  };

  const avgConfidence = (conf: Record<string, number>) => {
    const vals = Object.values(conf);
    if (vals.length === 0) return 0;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100);
  };

  const verifiedClaimsCount = claims.filter(c => c.status === "verified").length;

  const unifiedItems: UnifiedItem[] = [
    ...submissions.map(s => ({ kind: "submission" as const, data: s })),
    ...claims.map(c => ({ kind: "claim" as const, data: c })),
  ].sort((a, b) => {
    const dateA = a.kind === "submission" ? a.data.createdAt : a.data.created_at;
    const dateB = b.kind === "submission" ? b.data.createdAt : b.data.created_at;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  return (
    <div className="space-y-8" data-testid="my-skills-page">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-submit-heading">My Skills</h1>
        <p className="text-neutral-500 text-sm mt-1">
          Your skill contributions — submitted vendors and claimed brands
        </p>
      </div>

      {profile && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 text-center">
            <div className="flex items-center justify-center mb-2">
              <Send className="w-5 h-5 text-primary" />
            </div>
            <div className="text-2xl font-bold" data-testid="text-stat-submitted">{profile.skillsSubmitted}</div>
            <div className="text-xs text-neutral-500 mt-1">Submitted</div>
          </div>
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 text-center">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600" data-testid="text-stat-published">{profile.skillsPublished}</div>
            <div className="text-xs text-neutral-500 mt-1">Published</div>
          </div>
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-600" data-testid="text-stat-rate">
              {profile.skillsSubmitted > 0 ? Math.round((profile.skillsPublished / profile.skillsSubmitted) * 100) : 0}%
            </div>
            <div className="text-xs text-neutral-500 mt-1">Acceptance Rate</div>
          </div>
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 text-center">
            <div className="flex items-center justify-center mb-2">
              <Shield className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-600" data-testid="text-stat-claimed">{verifiedClaimsCount}</div>
            <div className="text-xs text-neutral-500 mt-1">Claimed</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-neutral-200 p-6" data-testid="submit-section">
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Submit a Vendor for Analysis
        </h3>
        <p className="text-xs text-neutral-500 mb-4">
          Enter a vendor&apos;s website URL and our AI will analyze their checkout flow, capabilities, and supported payment methods.
          If your email domain matches the vendor&apos;s domain, your submission will be flagged as &ldquo;Official&rdquo; for fast-track review.
        </p>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="url"
              value={submitUrl}
              onChange={e => setSubmitUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !submitting && handleSubmit()}
              placeholder="https://www.vendor-website.com"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              disabled={submitting}
              data-testid="input-submit-url"
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !submitUrl.trim()}
            className="rounded-xl px-6"
            data-testid="button-submit"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Analyzing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit
              </>
            )}
          </Button>
        </div>
        {submitError && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-600" data-testid="text-submit-error">
            <AlertTriangle className="w-4 h-4" />
            {submitError}
          </div>
        )}
        {submitSuccess && (
          <div className="mt-3 flex items-center gap-2 text-sm text-green-600" data-testid="text-submit-success">
            <CheckCircle2 className="w-4 h-4" />
            {submitSuccess}
          </div>
        )}
        {submitting && (
          <div className="mt-3 text-sm text-neutral-500">
            Running AI analysis: probing for APIs, analyzing checkout flow, detecting business features, checking protocol support...
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl text-xs"
          onClick={() => { setShowClaimModal(true); setClaimError(null); setClaimSuccess(null); setClaimSlug(""); setClaimSearchResults([]); }}
          data-testid="button-open-claim-modal"
        >
          <Shield className="w-3.5 h-3.5 mr-1.5" />
          Claim a Brand
        </Button>
      </div>

      <div>
        <h2 className="text-lg font-bold mb-4">Your Skills</h2>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : unifiedItems.length === 0 ? (
          <div className="text-center py-12 text-neutral-400 bg-white rounded-2xl border border-neutral-200" data-testid="text-empty-skills">
            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No skills yet</p>
            <p className="text-sm mt-1">Submit a vendor URL above or claim a brand to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {unifiedItems.map(item => {
              if (item.kind === "submission") {
                return <SubmissionCard key={`sub-${item.data.id}`} sub={item.data} avgConfidence={avgConfidence} />;
              }
              return <ClaimCard key={`claim-${item.data.id}`} claim={item.data} onRevoke={handleRevoke} revoking={revoking} />;
            })}
          </div>
        )}
      </div>

      <Dialog open={showClaimModal} onOpenChange={setShowClaimModal}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Claim a Brand</DialogTitle>
          <DialogDescription>
            Search for a brand in the Skills Hub and request ownership. If your email domain matches the brand, it will be verified automatically.
          </DialogDescription>

          <div className="space-y-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={claimSlug}
                onChange={handleClaimSearch}
                placeholder="Search brands..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                data-testid="input-claim-search"
              />
              {claimSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-neutral-400" />
              )}
            </div>

            {claimSearchResults.length > 0 && (
              <div className="border border-neutral-200 rounded-xl max-h-48 overflow-y-auto">
                {claimSearchResults.map(brand => (
                  <button
                    key={brand.slug}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-neutral-50 transition-colors flex items-center justify-between border-b border-neutral-100 last:border-b-0"
                    onClick={() => handleClaimBrand(brand.slug)}
                    disabled={claiming}
                    data-testid={`button-claim-${brand.slug}`}
                  >
                    <span className="font-medium">{brand.name}</span>
                    <span className="text-xs text-neutral-400">{brand.slug}</span>
                  </button>
                ))}
              </div>
            )}

            {claimError && (
              <div className="flex items-center gap-2 text-sm text-red-600" data-testid="text-claim-error">
                <AlertTriangle className="w-4 h-4" />
                {claimError}
              </div>
            )}
            {claimSuccess && (
              <div className="flex items-center gap-2 text-sm text-green-600" data-testid="text-claim-success">
                <CheckCircle2 className="w-4 h-4" />
                {claimSuccess}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
