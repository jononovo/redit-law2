"use client";

import { useState, useEffect, useCallback } from "react";

interface QueueEntry {
  id: number;
  domain: string;
  status: string;
  priority: number;
  error: string | null;
  resultSlug: string | null;
  resultScore: number | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface QueueStats {
  entries: QueueEntry[];
  pending: number;
  scanning: number;
  completed: number;
  failed: number;
  total: number;
}

interface SchedulerStatus {
  running: boolean;
  startedAt: string | null;
  lastTickAt: string | null;
  lastResult: string | null;
  totalProcessed: number;
  totalFailed: number;
  stopReason: string | null;
  quietHours: boolean;
  tickInProgress: boolean;
  expiresIn: string | null;
  nextTickIn: string | null;
  config: {
    intervalMinutes: number;
    maxRuntimeDays: number;
    quietHoursUTC: string;
  };
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    scanning: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-xs font-mono px-2 py-0.5 rounded ${styles[status] ?? "bg-neutral-100 text-neutral-600"}`} data-testid={`badge-status-${status}`}>
      {status}
    </span>
  );
}

function stopReasonLabel(reason: string | null): string {
  if (!reason) return "";
  switch (reason) {
    case "manual": return "Stopped manually";
    case "queue_empty": return "Queue empty — all done";
    case "auto_expired_3d": return "Auto-stopped after 3 days";
    default: return reason;
  }
}

export default function ScanQueuePage() {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [scheduler, setScheduler] = useState<SchedulerStatus | null>(null);
  const [domainInput, setDomainInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanRunning, setScanRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [allowRescans, setAllowRescans] = useState(false);
  const [authError, setAuthError] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/scan-queue", { credentials: "include" });
      if (res.status === 401) {
        setAuthError(true);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setAuthError(false);
      }
    } catch {
      // silently retry next poll
    }
  }, []);

  const fetchScheduler = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/scan-queue/scheduler", { credentials: "include" });
      if (res.ok) {
        setScheduler(await res.json());
      }
    } catch {
      // silently retry
    }
  }, []);

  const runNext = useCallback(async () => {
    setScanRunning(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/scan-queue/run", {
        method: "POST",
        credentials: "include",
      });
      if (res.status === 401) {
        setAuthError(true);
        return;
      }
      const data = await res.json();
      if (data.message) {
        setMessage(data.message);
      } else if (data.success) {
        setMessage(`Scanned ${data.domain} → score ${data.score}`);
      } else if (data.error) {
        setMessage(`Failed: ${data.error}`);
      }
      await fetchStats();
    } catch {
      setMessage("Request failed");
    } finally {
      setScanRunning(false);
    }
  }, [fetchStats]);

  async function toggleScheduler() {
    const action = scheduler?.running ? "stop" : "start";
    try {
      const res = await fetch("/api/admin/scan-queue/scheduler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessage(data.message);
        await fetchScheduler();
      }
    } catch {
      setMessage("Failed to toggle scheduler");
    }
  }

  useEffect(() => {
    fetchStats();
    fetchScheduler();
    const poll = setInterval(() => {
      fetchStats();
      fetchScheduler();
    }, 10000);
    return () => clearInterval(poll);
  }, [fetchStats, fetchScheduler]);

  async function handleAddDomains() {
    const domains = domainInput
      .split(/[\n,]+/)
      .map((d) => d.trim())
      .filter(Boolean);
    if (domains.length === 0) return;

    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/scan-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ domains, allowRescans }),
      });
      if (res.status === 401) {
        setAuthError(true);
        return;
      }
      const data = await res.json();
      const parts = [`Added ${data.added}`];
      if (data.duplicates?.length) {
        parts.push(`${data.duplicates.length} duplicate${data.duplicates.length > 1 ? "s" : ""}: ${data.duplicates.join(", ")}`);
      }
      if (data.skipped?.length) {
        parts.push(`${data.skipped.length} skipped: ${data.skipped.join(", ")}`);
      }
      setMessage(parts.join(" — "));
      setDomainInput("");
      await fetchStats();
    } catch {
      setMessage("Failed to add domains");
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(action: string, id?: number) {
    setLoading(true);
    try {
      await fetch("/api/admin/scan-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, id }),
      });
      await fetchStats();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center" data-testid="page-scan-queue-auth">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-2">Admin Access Required</h1>
          <p className="text-neutral-500 text-sm mb-4">Sign in with an admin account to access the scan queue.</p>
          <a href="/" className="text-sm text-neutral-400 hover:text-neutral-200 underline" data-testid="link-back-home">← Back to home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8" data-testid="page-scan-queue">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Scan Queue</h1>
            <p className="text-sm text-neutral-500 mt-1">Add domains, run scans, track results</p>
          </div>
          <a href="/" className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors" data-testid="link-back-home">← Back</a>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Pending", value: stats?.pending ?? 0, color: "text-amber-400" },
            { label: "Scanning", value: stats?.scanning ?? 0, color: "text-blue-400" },
            { label: "Completed", value: stats?.completed ?? 0, color: "text-green-400" },
            { label: "Failed", value: stats?.failed ?? 0, color: "text-red-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="border border-neutral-800 p-4" data-testid={`stat-${label.toLowerCase()}`}>
              <div className={`text-2xl font-mono ${color}`}>{value}</div>
              <div className="text-xs text-neutral-500 mt-1">{label}</div>
            </div>
          ))}
        </div>

        <div className="border border-neutral-800 p-6 mb-8">
          <h2 className="text-sm font-mono text-neutral-400 tracking-wide uppercase mb-4">Scheduler</h2>

          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={toggleScheduler}
              className={`px-4 py-2 text-sm font-medium border transition-colors ${
                scheduler?.running
                  ? "border-green-600 text-green-400 hover:bg-green-950"
                  : "border-neutral-700 text-neutral-400 hover:bg-neutral-900"
              }`}
              data-testid="button-scheduler-toggle"
            >
              {scheduler?.running ? "Scheduler ON" : "Scheduler OFF"}
            </button>

            <button
              onClick={() => setAllowRescans(!allowRescans)}
              className={`px-4 py-2 text-sm font-medium border transition-colors ${
                allowRescans
                  ? "border-amber-600 text-amber-400 hover:bg-amber-950"
                  : "border-neutral-700 text-neutral-400 hover:bg-neutral-900"
              }`}
              data-testid="button-allow-rescans"
            >
              {allowRescans ? "Allow Re-scans ON" : "Allow Re-scans OFF"}
            </button>

            {scheduler?.running && scheduler.nextTickIn && (
              <span className="text-sm font-mono text-neutral-500" data-testid="text-next-tick">
                Next tick in {scheduler.nextTickIn}
              </span>
            )}

            {scheduler?.running && scheduler.expiresIn && (
              <span className="text-sm font-mono text-neutral-600" data-testid="text-expires-in">
                Auto-stop in {scheduler.expiresIn}
              </span>
            )}

            {scheduler?.quietHours && (
              <span className="text-xs font-mono text-amber-500" data-testid="text-quiet-hours">
                quiet hours active
              </span>
            )}

            {scheduler?.tickInProgress && (
              <span className="text-xs font-mono text-blue-400 animate-pulse" data-testid="text-tick-in-progress">
                scanning...
              </span>
            )}
          </div>

          {scheduler && (
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
              {scheduler.lastResult && (
                <div className="col-span-2 mb-2">
                  <span className="text-neutral-500">Last result: </span>
                  <span className="font-mono text-neutral-300" data-testid="text-last-result">{scheduler.lastResult}</span>
                </div>
              )}
              <div>
                <span className="text-neutral-500">Processed: </span>
                <span className="font-mono text-neutral-300" data-testid="text-total-processed">{scheduler.totalProcessed}</span>
              </div>
              <div>
                <span className="text-neutral-500">Failed: </span>
                <span className="font-mono text-neutral-300" data-testid="text-total-failed">{scheduler.totalFailed}</span>
              </div>
              <div>
                <span className="text-neutral-500">Interval: </span>
                <span className="font-mono text-neutral-300">{scheduler.config.intervalMinutes}m</span>
              </div>
              <div>
                <span className="text-neutral-500">Quiet hours (UTC): </span>
                <span className="font-mono text-neutral-300">{scheduler.config.quietHoursUTC}</span>
              </div>
              {!scheduler.running && scheduler.stopReason && (
                <div className="col-span-2 mt-2">
                  <span className="text-xs font-mono text-neutral-600" data-testid="text-stop-reason">
                    {stopReasonLabel(scheduler.stopReason)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border border-neutral-800 p-6 mb-8">
          <h2 className="text-sm font-mono text-neutral-400 tracking-wide uppercase mb-4">Add Domains</h2>
          <textarea
            className="w-full bg-neutral-900 border border-neutral-700 text-neutral-200 p-3 font-mono text-sm resize-none focus:outline-none focus:border-neutral-500 placeholder-neutral-600"
            rows={5}
            placeholder={"amazon.com, walmart.com, shopify.com\nor one per line"}
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            data-testid="input-domains"
          />
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={handleAddDomains}
              disabled={loading || !domainInput.trim()}
              className="bg-neutral-100 text-neutral-900 px-4 py-2 text-sm font-medium hover:bg-white disabled:opacity-40 transition-colors"
              data-testid="button-add-domains"
            >
              Add to Queue
            </button>
            {message && (
              <span className="text-sm text-neutral-400" data-testid="text-message">{message}</span>
            )}
          </div>
        </div>

        <div className="border border-neutral-800 p-6 mb-8">
          <h2 className="text-sm font-mono text-neutral-400 tracking-wide uppercase mb-4">Manual Controls</h2>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={runNext}
              disabled={scanRunning || (stats?.pending ?? 0) === 0 || scheduler?.running || scheduler?.tickInProgress}
              className="bg-neutral-100 text-neutral-900 px-4 py-2 text-sm font-medium hover:bg-white disabled:opacity-40 transition-colors"
              data-testid="button-scan-next"
            >
              {scanRunning ? "Scanning..." : scheduler?.running ? "Scan Next (scheduler active)" : "Scan Next"}
            </button>
            <div className="flex-1" />
            <button
              onClick={() => handleAction("retry_failed")}
              disabled={loading || (stats?.failed ?? 0) === 0}
              className="border border-neutral-700 text-neutral-400 px-3 py-2 text-sm hover:bg-neutral-900 disabled:opacity-40 transition-colors"
              data-testid="button-retry-failed"
            >
              Retry Failed
            </button>
            <button
              onClick={() => handleAction("clear_completed")}
              disabled={loading || (stats?.completed ?? 0) === 0}
              className="border border-neutral-700 text-neutral-400 px-3 py-2 text-sm hover:bg-neutral-900 disabled:opacity-40 transition-colors"
              data-testid="button-clear-completed"
            >
              Clear Completed
            </button>
          </div>
        </div>

        <div className="border border-neutral-800">
          <div className="px-6 py-4 border-b border-neutral-800">
            <h2 className="text-sm font-mono text-neutral-400 tracking-wide uppercase">Queue</h2>
          </div>
          {!stats || stats.entries.length === 0 ? (
            <div className="px-6 py-12 text-center text-neutral-600 text-sm" data-testid="text-empty-queue">
              No entries in queue — paste domains above to get started
            </div>
          ) : (
            <div className="divide-y divide-neutral-800">
              {stats.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="px-6 py-3 grid grid-cols-[1fr_100px_80px_100px_32px] gap-4 items-center text-sm"
                  data-testid={`row-queue-${entry.id}`}
                >
                  <div>
                    <span className="font-mono text-neutral-200" data-testid={`text-domain-${entry.id}`}>{entry.domain}</span>
                    {entry.error && (
                      <span className="block text-xs text-red-400 mt-0.5 truncate" title={entry.error} data-testid={`text-error-${entry.id}`}>
                        {entry.error}
                      </span>
                    )}
                    {entry.resultSlug && (
                      <a
                        href={`/brands/${entry.resultSlug}`}
                        className="block text-xs text-blue-400 hover:text-blue-300 mt-0.5"
                        data-testid={`link-result-${entry.id}`}
                      >
                        → /brands/{entry.resultSlug}
                      </a>
                    )}
                  </div>
                  <StatusBadge status={entry.status} />
                  <span className="font-mono text-neutral-400" data-testid={`text-score-${entry.id}`}>
                    {entry.resultScore !== null ? entry.resultScore : "—"}
                  </span>
                  <span className="text-xs text-neutral-600">{timeAgo(entry.completedAt ?? entry.startedAt ?? entry.createdAt)}</span>
                  <button
                    onClick={() => handleAction("remove", entry.id)}
                    className="text-neutral-600 hover:text-red-400 transition-colors text-lg leading-none"
                    title="Remove"
                    data-testid={`button-remove-${entry.id}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
