"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Sparkles,
  Award,
  Users,
  Bot,
} from "lucide-react";

type DraftSummary = {
  id: number;
  vendorUrl: string;
  vendorSlug: string | null;
  status: string;
  autoPublish: boolean;
  reviewNeeded: string[];
  warnings: string[];
  confidence: Record<string, number>;
  vendorName: string;
  createdBy: string;
  submitterName: string | null;
  submitterType: string;
  submissionSource: string;
  createdAt: string;
  updatedAt: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pending Review", color: "bg-amber-100 text-amber-700 border-amber-200", icon: <Clock className="w-3 h-3" /> },
  reviewed: { label: "Reviewed", color: "bg-blue-100 text-blue-700 border-blue-200", icon: <CheckCircle2 className="w-3 h-3" /> },
  published: { label: "Published", color: "bg-green-100 text-green-700 border-green-200", icon: <CheckCircle2 className="w-3 h-3" /> },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700 border-red-200", icon: <XCircle className="w-3 h-3" /> },
};

export default function SkillReviewPage() {
  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [analyzeUrl, setAnalyzeUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/v1/skills/drafts${params}`);
      const data = await res.json();
      setDrafts(data.drafts || []);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDrafts();
  }, [statusFilter]);

  const handleAnalyze = async () => {
    if (!analyzeUrl.trim()) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const res = await fetch("/api/v1/skills/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: analyzeUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAnalyzeError(data.message || "Analysis failed");
      } else {
        setAnalyzeUrl("");
        fetchDrafts();
      }
    } catch {
      setAnalyzeError("Network error — please try again");
    }
    setAnalyzing(false);
  };

  const filteredDrafts = drafts.filter(d =>
    sourceFilter === "all" || d.submissionSource === sourceFilter
  );

  const avgConfidence = (conf: Record<string, number>) => {
    const vals = Object.values(conf);
    if (vals.length === 0) return 0;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100);
  };

  return (
    <div className="space-y-8" data-testid="skills-review-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-review-heading">Skill Builder</h1>
          <p className="text-neutral-500 text-sm mt-1">Analyze vendor websites and generate procurement skills</p>
        </div>
        <Link href="/skill-builder/export">
          <Button variant="outline" className="rounded-xl" data-testid="link-export-page">
            Export Skills
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 p-6" data-testid="analyze-section">
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Analyze New Vendor
        </h3>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="url"
              value={analyzeUrl}
              onChange={e => setAnalyzeUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !analyzing && handleAnalyze()}
              placeholder="https://www.example-vendor.com"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              disabled={analyzing}
              data-testid="input-analyze-url"
            />
          </div>
          <Button
            onClick={handleAnalyze}
            disabled={analyzing || !analyzeUrl.trim()}
            className="rounded-xl px-6"
            data-testid="button-analyze"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Analyzing...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Analyze
              </>
            )}
          </Button>
        </div>
        {analyzeError && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-600" data-testid="text-analyze-error">
            <AlertTriangle className="w-4 h-4" />
            {analyzeError}
          </div>
        )}
        {analyzing && (
          <div className="mt-3 text-sm text-neutral-500">
            Running 4-pass analysis: probing for APIs, analyzing checkout flow with AI, detecting business features, checking protocol support...
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {["all", "pending", "reviewed", "published", "rejected"].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === s
                  ? "bg-primary text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
              data-testid={`button-filter-${s}`}
            >
              {s === "all" ? "All" : STATUS_CONFIG[s]?.label || s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {[
            { key: "all", label: "All Sources", icon: null },
            { key: "admin", label: "Admin", icon: <Bot className="w-3 h-3" /> },
            { key: "community", label: "Community", icon: <Users className="w-3 h-3" /> },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setSourceFilter(s.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                sourceFilter === s.key
                  ? "bg-neutral-800 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
              data-testid={`button-source-${s.key}`}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filteredDrafts.length === 0 ? (
        <div className="text-center py-12 text-neutral-400" data-testid="text-empty-state">
          <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No drafts yet</p>
          <p className="text-sm mt-1">Analyze a vendor URL above to generate your first skill draft</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDrafts.map(draft => {
            const statusInfo = STATUS_CONFIG[draft.status] || STATUS_CONFIG.pending;
            const conf = avgConfidence(draft.confidence);
            return (
              <Link
                key={draft.id}
                href={`/app/skills/review/${draft.id}`}
                className="block bg-white rounded-2xl border border-neutral-200 p-5 hover:border-primary/30 hover:shadow-sm transition-all"
                data-testid={`link-draft-${draft.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base" data-testid={`text-draft-name-${draft.id}`}>
                          {draft.vendorName}
                        </h3>
                        {draft.submissionSource === "community" && (
                          draft.submitterType === "official" ? (
                            <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] font-semibold flex items-center gap-0.5">
                              <Award className="w-3 h-3" />
                              Official
                            </Badge>
                          ) : (
                            <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[10px] font-semibold flex items-center gap-0.5">
                              <Users className="w-3 h-3" />
                              Community
                            </Badge>
                          )
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-neutral-400">{draft.vendorUrl}</span>
                        <ExternalLink className="w-3 h-3 text-neutral-400" />
                        {draft.submitterName && (
                          <span className="text-xs text-neutral-400">
                            by {draft.submitterName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {draft.reviewNeeded.length > 0 && (
                      <span className="text-xs text-amber-600 font-medium" data-testid={`text-review-count-${draft.id}`}>
                        {draft.reviewNeeded.length} fields need review
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
                {draft.warnings.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-amber-600">
                    <AlertTriangle className="w-3 h-3" />
                    {draft.warnings.length} warning{draft.warnings.length > 1 ? "s" : ""}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
