"use client";

import { CheckCircle, XCircle, Clock, Zap, Target, AlertTriangle } from "lucide-react";
import type { TestReport } from "../types";

interface AgentTestReportCardProps {
  report: TestReport;
}

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  const color =
    score >= 90 ? "text-green-500" :
    score >= 80 ? "text-blue-500" :
    score >= 70 ? "text-yellow-500" :
    score >= 60 ? "text-orange-500" :
    "text-red-500";

  const strokeColor =
    score >= 90 ? "#22c55e" :
    score >= 80 ? "#3b82f6" :
    score >= 70 ? "#eab308" :
    score >= 60 ? "#f97316" :
    "#ef4444";

  return (
    <div className="relative w-28 h-28" data-testid="score-ring">
      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={strokeColor} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${color}`} data-testid="score-value">{score}</span>
        <span className={`text-sm font-semibold ${color}`} data-testid="grade-value">{grade}</span>
      </div>
    </div>
  );
}

function ScoreBar({ label, score, weight, icon }: { label: string; score: number; weight: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3" data-testid={`score-bar-${label.toLowerCase()}`}>
      <div className="flex items-center gap-1.5 w-28 shrink-0">
        {icon}
        <span className="text-xs font-medium text-neutral-700">{label}</span>
        <span className="text-xs text-neutral-400">({weight}%)</span>
      </div>
      <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-500" : "bg-red-500"
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-mono text-neutral-600 w-8 text-right">{score}</span>
    </div>
  );
}

export function AgentTestReportCard({ report }: AgentTestReportCardProps) {
  return (
    <div className="w-full bg-white border border-neutral-200 rounded-xl p-5 space-y-5" data-testid="agent-test-report-card">
      <div className="flex items-start gap-4">
        <ScoreRing score={report.overall_score} grade={report.grade} />
        <div className="flex-1 pt-1">
          <p className="text-sm text-neutral-700 leading-relaxed" data-testid="report-summary">
            {report.summary}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <ScoreBar label="Accuracy" score={report.scores.accuracy.score} weight={report.scores.accuracy.weight} icon={<Target className="w-3.5 h-3.5 text-neutral-500" />} />
        <ScoreBar label="Completion" score={report.scores.completion.score} weight={report.scores.completion.weight} icon={<CheckCircle className="w-3.5 h-3.5 text-neutral-500" />} />
        <ScoreBar label="Speed" score={report.scores.speed.score} weight={report.scores.speed.weight} icon={<Clock className="w-3.5 h-3.5 text-neutral-500" />} />
        <ScoreBar label="Efficiency" score={report.scores.efficiency.score} weight={report.scores.efficiency.weight} icon={<Zap className="w-3.5 h-3.5 text-neutral-500" />} />
      </div>

      <div>
        <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Field Breakdown</h4>
        <div className="grid gap-1.5">
          {report.field_breakdown.map((field) => (
            <div
              key={field.field_name}
              className="flex items-center gap-2 text-xs"
              data-testid={`field-row-${field.field_name}`}
            >
              {field.accurate ? (
                <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
              )}
              <span className="font-medium text-neutral-700 w-28">{field.field_name}</span>
              <span className="text-neutral-400">
                {field.time_to_fill_ms > 0 ? `${(field.time_to_fill_ms / 1000).toFixed(1)}s` : "—"}
              </span>
              {field.retypes > 0 && (
                <span className="text-amber-600 text-[10px] bg-amber-50 px-1.5 py-0.5 rounded">
                  {field.retypes} retype{field.retypes > 1 ? "s" : ""}
                </span>
              )}
              {field.notes.length > 0 && (
                <span className="text-neutral-400 text-[10px] truncate max-w-[140px]" title={field.notes[0]}>
                  {field.notes[0]}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {report.timeline.gaps.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Hesitation Gaps</h4>
          {report.timeline.gaps.map((gap, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-amber-700" data-testid={`gap-${i}`}>
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span>{gap.note}</span>
            </div>
          ))}
        </div>
      )}

      {report.flags.length > 0 && (
        <div className="bg-neutral-50 rounded-lg px-3 py-2">
          <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Flags</h4>
          <ul className="space-y-0.5">
            {report.flags.map((flag, i) => (
              <li key={i} className="text-xs text-neutral-600" data-testid={`flag-${i}`}>
                • {flag}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.approval.required && (
        <div className="text-xs text-neutral-400 border-t border-neutral-100 pt-3">
          Approval: {report.approval.auto_approved ? "Auto-approved" : `${report.approval.wait_seconds ?? 0}s wait`}
        </div>
      )}
    </div>
  );
}
