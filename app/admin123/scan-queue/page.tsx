"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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

const SCAN_INTERVAL_MS = 17 * 60 * 1000;

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

export default function ScanQueuePage() {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [domainInput, setDomainInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanRunning, setScanRunning] = useState(false);
  const [autoScan, setAutoScan] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [nextScanIn, setNextScanIn] = useState<string | null>(null);
  const autoScanRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      setLastScanTime(new Date());
      await fetchStats();
    } catch {
      setMessage("Request failed");
    } finally {
      setScanRunning(false);
    }
  }, [fetchStats]);

  useEffect(() => {
    fetchStats();
    const pollInterval = setInterval(fetchStats, 10000);
    return () => clearInterval(pollInterval);
  }, [fetchStats]);

  useEffect(() => {
    autoScanRef.current = autoScan;
  }, [autoScan]);

  useEffect(() => {
    if (autoScan && stats && stats.pending > 0) {
      if (!timerRef.current) {
        runNext();
        setLastScanTime(new Date());
        timerRef.current = setInterval(() => {
          if (autoScanRef.current) {
            runNext();
          }
        }, SCAN_INTERVAL_MS);
      }
    } else if (!autoScan && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [autoScan]);

  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (autoScan && lastScanTime) {
      countdownRef.current = setInterval(() => {
        const elapsed = Date.now() - lastScanTime.getTime();
        const remaining = Math.max(0, SCAN_INTERVAL_MS - elapsed);
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        setNextScanIn(`${mins}:${secs.toString().padStart(2, "0")}`);
      }, 1000);
    } else {
      setNextScanIn(null);
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [autoScan, lastScanTime]);

  async function handleAddDomains() {
    const domains = domainInput
      .split("\n")
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
        body: JSON.stringify({ domains }),
      });
      if (res.status === 401) {
        setAuthError(true);
        return;
      }
      const data = await res.json();
      setMessage(`Added ${data.added} domain(s)${data.skipped?.length ? ` — skipped: ${data.skipped.join(", ")}` : ""}`);
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
          <h2 className="text-sm font-mono text-neutral-400 tracking-wide uppercase mb-4">Add Domains</h2>
          <textarea
            className="w-full bg-neutral-900 border border-neutral-700 text-neutral-200 p-3 font-mono text-sm resize-none focus:outline-none focus:border-neutral-500 placeholder-neutral-600"
            rows={5}
            placeholder={"amazon.com\nwalmart.com\nshopify.com"}
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
          <h2 className="text-sm font-mono text-neutral-400 tracking-wide uppercase mb-4">Controls</h2>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={runNext}
              disabled={scanRunning || (stats?.pending ?? 0) === 0}
              className="bg-neutral-100 text-neutral-900 px-4 py-2 text-sm font-medium hover:bg-white disabled:opacity-40 transition-colors"
              data-testid="button-scan-next"
            >
              {scanRunning ? "Scanning…" : "Scan Next"}
            </button>
            <button
              onClick={() => setAutoScan(!autoScan)}
              className={`px-4 py-2 text-sm font-medium border transition-colors ${
                autoScan
                  ? "border-green-600 text-green-400 hover:bg-green-950"
                  : "border-neutral-700 text-neutral-400 hover:bg-neutral-900"
              }`}
              data-testid="button-auto-scan"
            >
              {autoScan ? "Auto-Scan ON" : "Auto-Scan OFF"}
            </button>
            {autoScan && nextScanIn && (
              <span className="text-sm font-mono text-neutral-500" data-testid="text-countdown">
                Next in {nextScanIn}
              </span>
            )}
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
