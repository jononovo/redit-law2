"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type Profile = {
  skillsSubmitted: number;
  skillsPublished: number;
  skillsRejected: number;
} | null;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Under Review", color: "bg-amber-100 text-amber-700 border-amber-200", icon: <Clock className="w-3 h-3" /> },
  reviewed: { label: "Reviewed", color: "bg-blue-100 text-blue-700 border-blue-200", icon: <CheckCircle2 className="w-3 h-3" /> },
  published: { label: "Published", color: "bg-green-100 text-green-700 border-green-200", icon: <CheckCircle2 className="w-3 h-3" /> },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700 border-red-200", icon: <XCircle className="w-3 h-3" /> },
};

export default function SkillSubmitPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [profile, setProfile] = useState<Profile>(null);
  const [loading, setLoading] = useState(true);
  const [submitUrl, setSubmitUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/skills/submissions/mine");
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
        setProfile(data.profile);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubmissions();
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
        fetchSubmissions();
      }
    } catch {
      setSubmitError("Network error — please try again");
    }
    setSubmitting(false);
  };

  const avgConfidence = (conf: Record<string, number>) => {
    const vals = Object.values(conf);
    if (vals.length === 0) return 0;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100);
  };

  return (
    <div className="space-y-8" data-testid="skill-submit-page">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-submit-heading">Submit a Vendor Skill</h1>
        <p className="text-neutral-500 text-sm mt-1">
          Help grow the procurement skills library by submitting vendor websites for analysis
        </p>
      </div>

      {profile && (
        <div className="grid grid-cols-3 gap-4">
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
        </div>
      )}

      <div className="bg-white rounded-2xl border border-neutral-200 p-6" data-testid="submit-section">
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Submit a Vendor for Analysis
        </h3>
        <p className="text-xs text-neutral-500 mb-4">
          Enter a vendor's website URL and our AI will analyze their checkout flow, capabilities, and supported payment methods.
          If your email domain matches the vendor's domain, your submission will be flagged as "Official" for fast-track review.
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

      <div>
        <h2 className="text-lg font-bold mb-4">Your Submissions</h2>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-12 text-neutral-400 bg-white rounded-2xl border border-neutral-200" data-testid="text-empty-submissions">
            <Send className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No submissions yet</p>
            <p className="text-sm mt-1">Submit a vendor URL above to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map(sub => {
              const statusInfo = STATUS_CONFIG[sub.status] || STATUS_CONFIG.pending;
              const conf = avgConfidence(sub.confidence);
              return (
                <div
                  key={sub.id}
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
            })}
          </div>
        )}
      </div>
    </div>
  );
}
