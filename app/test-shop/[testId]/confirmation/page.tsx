"use client";

import { useEffect, useState, useCallback } from "react";
import { useShopTest } from "@/features/agent-testing/full-shop/client/shop-test-context";

interface StageBreakdown {
  stage: string;
  stageNumber: number;
  stagePassed: boolean;
  durationMs: number;
  corrections: number;
  eventCount: number;
}

interface NarrativeEntry {
  timestamp_display: string;
  stage: string;
  event_type: string;
  description: string;
  is_correction: boolean;
  is_mistake: boolean;
}

interface DecisionEntry {
  instruction: string;
  expected: string;
  actual: string | null;
  match: boolean;
  stage: string;
}

interface ScoreDetail {
  score: number;
  weight: number;
  decisions?: DecisionEntry[];
  matchingFields?: number;
  totalFields?: number;
  mismatches?: { field: string; expected: string; actual: string }[];
  stagesCompleted?: number;
  totalStages?: number;
  termsChecked?: boolean;
  totalSeconds?: number;
  benchmark?: string;
  backtracks?: number;
  wrongClicks?: number;
  corrections?: number;
}

interface FullReport {
  test_id?: string;
  overall_score: number;
  grade: string;
  summary: string;
  scores?: Record<string, ScoreDetail>;
  stage_breakdown?: StageBreakdown[];
  event_narrative?: NarrativeEntry[];
  decision_audit?: DecisionEntry[];
  raw_event_count?: number;
  timeline?: {
    total_duration_ms: number;
    per_stage_duration_ms: Record<string, number>;
    wasted_time_ms: number;
    gaps: { after_stage: string; before_stage: string; gap_ms: number; note: string }[];
  };
  flags?: string[];
}

const SCORE_LABELS: Record<string, string> = {
  instructionFollowing: "Instruction Following",
  dataAccuracy: "Data Accuracy",
  flowCompletion: "Flow Completion",
  speed: "Speed",
  navigationEfficiency: "Navigation Efficiency",
};

const STAGE_LABELS: Record<string, string> = {
  navigation: "Navigation",
  search: "Search",
  product_select: "Product Selection",
  add_to_cart: "Add to Cart",
  cart_review: "Cart Review",
  shipping: "Shipping",
  payment: "Payment",
  confirmation: "Confirmation",
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const remainder = s % 60;
  return `${m}m ${remainder}s`;
}

function gradeColor(grade: string): string {
  if (grade === "A") return "text-green-600";
  if (grade === "B") return "text-blue-600";
  if (grade === "C") return "text-yellow-600";
  return "text-red-600";
}

function scoreBarColor(score: number): string {
  if (score >= 90) return "bg-green-500";
  if (score >= 70) return "bg-blue-500";
  if (score >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

function ScoreBreakdown({ scores }: { scores: Record<string, ScoreDetail> }) {
  return (
    <div data-testid="section-score-breakdown" className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-4 text-sm uppercase tracking-wide">Score Breakdown</h3>
      <div className="space-y-4">
        {Object.entries(scores).map(([key, val]) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-gray-700">
                {SCORE_LABELS[key] || key.replace(/([A-Z])/g, " $1").trim()}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{val.weight}%</span>
                <span
                  data-testid={`text-score-${key}`}
                  className="text-sm font-semibold text-gray-900 w-8 text-right"
                >
                  {val.score}
                </span>
              </div>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${scoreBarColor(val.score)}`}
                style={{ width: `${val.score}%` }}
              />
            </div>
            {val.mismatches && val.mismatches.length > 0 && (
              <div className="mt-1.5 text-xs text-red-500">
                {val.mismatches.length} field mismatch{val.mismatches.length > 1 ? "es" : ""}
              </div>
            )}
            {val.stagesCompleted !== undefined && val.totalStages !== undefined && (
              <div className="mt-1.5 text-xs text-gray-500">
                {val.stagesCompleted}/{val.totalStages} stages completed
              </div>
            )}
            {val.totalSeconds !== undefined && (
              <div className="mt-1.5 text-xs text-gray-500">
                {val.totalSeconds}s total ({val.benchmark})
              </div>
            )}
            {(val.backtracks !== undefined && val.backtracks > 0) && (
              <div className="mt-1.5 text-xs text-gray-500">
                {val.backtracks} backtrack{val.backtracks > 1 ? "s" : ""}, {val.corrections} correction{(val.corrections ?? 0) > 1 ? "s" : ""}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StageTimeline({ stages, perStageDuration }: { stages: StageBreakdown[]; perStageDuration?: Record<string, number> }) {
  return (
    <div data-testid="section-stage-timeline" className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-4 text-sm uppercase tracking-wide">Stage Timeline</h3>
      <div className="space-y-3">
        {stages.map((s, i) => {
          const duration = perStageDuration?.[s.stage] ?? s.durationMs;
          return (
            <div key={s.stage} className="flex items-center gap-3" data-testid={`stage-row-${s.stage}`}>
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                {s.eventCount === 0 ? (
                  <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400 text-xs">—</span>
                  </div>
                ) : s.stagePassed ? (
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                    <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800">
                    {STAGE_LABELS[s.stage] || s.stage}
                  </span>
                  <div className="flex items-center gap-3">
                    {s.corrections > 0 && (
                      <span className="text-xs text-orange-500">{s.corrections} correction{s.corrections > 1 ? "s" : ""}</span>
                    )}
                    <span className="text-xs text-gray-400 font-mono" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {duration > 0 ? formatDuration(duration) : "—"}
                    </span>
                  </div>
                </div>
              </div>
              {i < stages.length - 1 && (
                <div className="absolute left-[1.45rem] mt-6 w-px h-3 bg-gray-200" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FlagsSection({ flags }: { flags: string[] }) {
  if (flags.length === 0) return null;
  return (
    <div data-testid="section-flags" className="bg-orange-50 rounded-xl border border-orange-200 p-6">
      <h3 className="font-semibold text-orange-800 mb-3 text-sm uppercase tracking-wide">Flags & Warnings</h3>
      <ul className="space-y-2">
        {flags.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-orange-700">
            <span className="flex-shrink-0 mt-0.5">⚠</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EventLog({ narrative }: { narrative: NarrativeEntry[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div data-testid="section-event-log" className="bg-white rounded-xl border border-gray-200 p-6">
      <button
        data-testid="button-toggle-log"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
          Event Log ({narrative.length} events)
        </h3>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="mt-4 max-h-96 overflow-y-auto border-t border-gray-100 pt-4">
          <div className="space-y-1.5">
            {narrative.map((entry, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 text-xs py-1 px-2 rounded ${
                  entry.is_mistake ? "bg-red-50" : entry.is_correction ? "bg-yellow-50" : ""
                }`}
              >
                <span
                  className="text-gray-400 flex-shrink-0 w-16 text-right"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {entry.timestamp_display}
                </span>
                <span className="text-gray-400 flex-shrink-0 w-24 truncate">{STAGE_LABELS[entry.stage] || entry.stage}</span>
                <span className={`flex-1 ${entry.is_mistake ? "text-red-700" : entry.is_correction ? "text-orange-700" : "text-gray-700"}`}>
                  {entry.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConfirmationPage() {
  const { testId, isObserver, testStatus } = useShopTest();
  const [report, setReport] = useState<FullReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const observeParam = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("observe")
    : null;

  const observeQs = observeParam ? `?observe=${observeParam}` : "";

  useEffect(() => {
    let attempts = 0;
    let cancelled = false;

    async function fetchReport() {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/v1/agent-testing/tests/${testId}/report${observeQs}`);
        if (res.ok) {
          const data = await res.json();
          if (data.overall_score !== undefined) {
            setReport(data);
            setLoading(false);
            return;
          }
          if (data.score !== undefined) {
            setReport({
              overall_score: data.score,
              grade: data.grade,
              summary: "",
            });
            setLoading(false);
            return;
          }
        }
      } catch {}

      attempts++;
      const isTerminal = testStatus === "scored" || testStatus === "submitted";
      const maxAttempts = isTerminal ? 30 : 10;
      if (attempts < maxAttempts && !cancelled) {
        setTimeout(fetchReport, 2000);
      } else {
        setLoading(false);
      }
    }

    fetchReport();
    return () => { cancelled = true; };
  }, [testId, observeQs, testStatus]);

  const handleDownloadJson = useCallback(async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/v1/agent-testing/tests/${testId}/events${observeQs}${observeQs ? "&" : "?"}since=-1`);
      if (!res.ok) throw new Error("Failed to fetch events");
      const data = await res.json();

      const exportData = {
        test_id: testId,
        exported_at: new Date().toISOString(),
        report: report ? {
          overall_score: report.overall_score,
          grade: report.grade,
          summary: report.summary,
          scores: report.scores,
          flags: report.flags,
          timeline: report.timeline,
        } : null,
        events: data.events,
        event_count: data.count,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `test-report-${testId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(false);
    }
  }, [testId, observeQs, report]);

  return (
    <div data-testid="page-confirmation" className="max-w-2xl mx-auto py-12 px-4">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Test Transaction Complete
        </h1>
        <p className="text-gray-600">
          Your simulated purchase has been processed and scored.
        </p>
      </div>

      {loading ? (
        <div data-testid="text-loading-report" className="text-center animate-pulse text-gray-400">
          Generating report...
        </div>
      ) : report ? (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div
              data-testid="text-grade"
              className={`text-6xl font-bold mb-2 ${gradeColor(report.grade)}`}
            >
              {report.grade}
            </div>
            <div data-testid="text-score" className="text-2xl font-semibold text-gray-900 mb-3">
              {report.overall_score} / 100
            </div>
            {report.summary && (
              <p data-testid="text-summary" className="text-gray-600 text-sm max-w-md mx-auto">
                {report.summary}
              </p>
            )}
            {report.timeline && (
              <div className="mt-4 flex items-center justify-center gap-6 text-xs text-gray-400">
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Total: {formatDuration(report.timeline.total_duration_ms)}
                </span>
                {report.timeline.wasted_time_ms > 0 && (
                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Idle: {formatDuration(report.timeline.wasted_time_ms)}
                  </span>
                )}
                {report.raw_event_count !== undefined && (
                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {report.raw_event_count} events
                  </span>
                )}
              </div>
            )}
          </div>

          {report.scores && <ScoreBreakdown scores={report.scores} />}

          {report.stage_breakdown && report.stage_breakdown.length > 0 && (
            <StageTimeline
              stages={report.stage_breakdown}
              perStageDuration={report.timeline?.per_stage_duration_ms}
            />
          )}

          {report.flags && report.flags.length > 0 && (
            <FlagsSection flags={report.flags} />
          )}

          {report.event_narrative && report.event_narrative.length > 0 && (
            <EventLog narrative={report.event_narrative} />
          )}

          <div className="flex justify-center">
            <button
              data-testid="button-download-json"
              onClick={handleDownloadJson}
              disabled={downloading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {downloading ? "Downloading..." : "Download Full Report (JSON)"}
            </button>
          </div>
        </div>
      ) : (
        <div data-testid="text-report-unavailable" className="text-center text-gray-500">
          Report not available. The test may still be processing.
        </div>
      )}
    </div>
  );
}
