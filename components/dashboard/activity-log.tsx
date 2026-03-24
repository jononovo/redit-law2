"use client";

import { useEffect, useState } from "react";
import { Activity, Loader2, CheckCircle2, XCircle, AlertTriangle, Clock } from "lucide-react";

interface LogEntry {
  id: number;
  bot_id: string;
  bot_name: string;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number | null;
  error_code: string | null;
  created_at: string;
}

function endpointLabel(ep: string): string {
  const map: Record<string, string> = {
    "/api/v1/bot/wallet/check": "Wallet Check",
    "/api/v1/bot/wallet/spending": "Spending Rules",
    "/api/v1/bot/wallet/purchase": "Purchase",
    "/api/v1/bot/wallet/topup-request": "Top-up Request",
    "/api/v1/bot/wallet/transactions": "Transactions",
  };
  return map[ep] || ep;
}

function statusIcon(code: number) {
  if (code >= 200 && code < 300) return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  if (code === 429) return <Clock className="w-4 h-4 text-amber-500" />;
  if (code >= 400 && code < 500) return <AlertTriangle className="w-4 h-4 text-amber-500" />;
  return <XCircle className="w-4 h-4 text-red-500" />;
}

function statusBadge(code: number) {
  if (code >= 200 && code < 300) return "bg-green-50 text-green-700";
  if (code === 429) return "bg-amber-50 text-amber-700";
  if (code >= 400 && code < 500) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function ActivityLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/activity-log")
      .then((res) => (res.ok ? res.json() : { logs: [] }))
      .then((data) => setLogs(data.logs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div data-testid="section-activity-log">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-neutral-400" />
        <h2 className="text-lg font-bold text-neutral-900">Bot Activity</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-8 text-center">
          <Activity className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
          <p className="text-sm text-neutral-500">No bot API activity yet.</p>
          <p className="text-xs text-neutral-400 mt-1">API calls from your bots will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-100 shadow-sm divide-y divide-neutral-50 overflow-hidden">
          {logs.slice(0, 20).map((log) => (
            <div key={log.id} className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors" data-testid={`activity-log-${log.id}`}>
              {statusIcon(log.status_code)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-neutral-900 truncate">{log.bot_name}</span>
                  <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${statusBadge(log.status_code)}`}>
                    {log.status_code}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-neutral-500">{endpointLabel(log.endpoint)}</span>
                  {log.error_code && (
                    <span className="text-xs text-red-400">{log.error_code}</span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs text-neutral-400">{timeAgo(log.created_at)}</span>
                {log.response_time_ms != null && (
                  <p className="text-xs text-neutral-300 mt-0.5">{log.response_time_ms}ms</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
