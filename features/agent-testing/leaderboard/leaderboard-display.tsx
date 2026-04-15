"use client";

import { useState, useEffect } from "react";
import { Trophy } from "lucide-react";
import type { LeaderboardEntry } from "./leaderboard-types";

function gradeColorClass(grade: string): string {
  switch (grade) {
    case "A": return "text-emerald-600 bg-emerald-50";
    case "B": return "text-teal-600 bg-teal-50";
    case "C": return "text-amber-600 bg-amber-50";
    case "D": return "text-orange-600 bg-orange-50";
    default: return "text-red-600 bg-red-50";
  }
}

function rankBadge(rank: number): React.ReactNode {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return <span className="text-sm font-bold text-neutral-400">#{rank}</span>;
}

function formatCompletedDate(isoString: string): string {
  if (!isoString) return "—";
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface LeaderboardDisplayProps {
  limit?: number;
  showTitle?: boolean;
  compact?: boolean;
}

export function LeaderboardDisplay({ limit = 10, showTitle = true, compact = false }: LeaderboardDisplayProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/v1/agent-testing/leaderboard?limit=${limit}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load leaderboard");
        return res.json();
      })
      .then((data) => {
        setEntries(data.entries);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [limit]);

  if (loading) {
    return (
      <div data-testid="leaderboard-loading" className="space-y-3">
        {Array.from({ length: Math.min(limit, 5) }).map((_, i) => (
          <div key={i} className="h-12 bg-neutral-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="leaderboard-error" className="text-center py-8 text-neutral-400 text-sm">
        Could not load leaderboard
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div data-testid="leaderboard-empty" className="text-center py-12">
        <Trophy className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
        <p className="text-neutral-500 font-medium">No scores yet</p>
        <p className="text-neutral-400 text-sm mt-1">Be the first to test your agent</p>
      </div>
    );
  }

  return (
    <div data-testid="leaderboard-container">
      {showTitle && (
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="w-6 h-6 text-amber-500" />
          <h2 className="text-2xl font-extrabold tracking-tight text-neutral-900">
            Top Agents
          </h2>
        </div>
      )}

      <div className={`bg-white rounded-xl border border-neutral-200 overflow-hidden ${compact ? "" : "shadow-sm"}`}>
        <div className="grid grid-cols-[3rem_1fr_4rem_3rem_5rem] gap-2 px-4 py-2.5 bg-neutral-50 border-b border-neutral-100 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          <span></span>
          <span>Agent</span>
          <span className="text-right">Score</span>
          <span className="text-center">Grade</span>
          <span className="text-right">Date</span>
        </div>

        <div className="divide-y divide-neutral-50">
          {entries.map((entry) => (
            <div
              key={`${entry.rank}-${entry.displayName}`}
              data-testid={`leaderboard-row-${entry.rank}`}
              className={`grid grid-cols-[3rem_1fr_4rem_3rem_5rem] gap-2 px-4 items-center transition-colors hover:bg-neutral-50 ${
                compact ? "py-2.5" : "py-3"
              } ${entry.rank <= 3 ? "bg-amber-50/30" : ""}`}
            >
              <div className="flex items-center justify-center">
                {rankBadge(entry.rank)}
              </div>

              <div className="min-w-0">
                <span
                  data-testid={`leaderboard-agent-name-${entry.rank}`}
                  className={`font-semibold truncate block ${entry.rank <= 3 ? "text-neutral-900" : "text-neutral-700"}`}
                >
                  {entry.displayName}
                </span>
              </div>

              <div className="text-right">
                <span
                  data-testid={`leaderboard-score-${entry.rank}`}
                  className="font-bold text-neutral-900 tabular-nums"
                >
                  {entry.score}
                </span>
              </div>

              <div className="flex justify-center">
                <span
                  data-testid={`leaderboard-grade-${entry.rank}`}
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold ${gradeColorClass(entry.grade)}`}
                >
                  {entry.grade}
                </span>
              </div>

              <div className="text-right">
                <span className="text-xs text-neutral-400">
                  {formatCompletedDate(entry.completedAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
