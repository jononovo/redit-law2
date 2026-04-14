"use client";

import { useEffect, useState } from "react";
import { useShopTest } from "@/features/agent-testing/full-shop/client/shop-test-context";

interface ReportSummary {
  overall_score: number;
  grade: string;
  summary: string;
  scores?: Record<string, { score: number; weight: number }>;
}

export default function ConfirmationPage() {
  const { testId, isObserver } = useShopTest();
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const observeParam = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("observe")
    : null;

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 10;

    async function fetchReport() {
      try {
        const observeQs = observeParam ? `?observe=${observeParam}` : "";
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
      if (attempts < maxAttempts) {
        setTimeout(fetchReport, 2000);
      } else {
        setLoading(false);
      }
    }

    fetchReport();
  }, [testId, observeParam]);

  return (
    <div data-testid="page-confirmation" className="max-w-2xl mx-auto text-center py-12">
      <div className="text-5xl mb-4">✓</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Test Transaction Complete
      </h1>
      <p className="text-gray-600 mb-8">
        Your simulated purchase has been processed and scored.
      </p>

      {loading ? (
        <div data-testid="text-loading-report" className="animate-pulse text-gray-400">
          Generating report...
        </div>
      ) : report ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-left">
          <div className="text-center mb-6">
            <div
              data-testid="text-grade"
              className={`text-6xl font-bold mb-2 ${
                report.grade === "A" ? "text-green-600" :
                report.grade === "B" ? "text-blue-600" :
                report.grade === "C" ? "text-yellow-600" :
                "text-red-600"
              }`}
            >
              {report.grade}
            </div>
            <div data-testid="text-score" className="text-2xl font-semibold text-gray-900">
              {report.overall_score} / 100
            </div>
          </div>

          {report.summary && (
            <p data-testid="text-summary" className="text-gray-600 text-center mb-6">
              {report.summary}
            </p>
          )}

          {report.scores && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Score Breakdown</h3>
              {Object.entries(report.scores).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${val.score}%` }}
                      />
                    </div>
                    <span
                      data-testid={`text-score-${key}`}
                      className="text-sm font-medium text-gray-900 w-8 text-right"
                    >
                      {val.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div data-testid="text-report-unavailable" className="text-gray-500">
          Report not available. The test may still be processing.
        </div>
      )}
    </div>
  );
}
