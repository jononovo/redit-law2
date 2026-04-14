"use client";

import { useState } from "react";

export default function AgentTestLandingPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    test_id: string;
    test_url: string;
    observe_url: string;
    instructions: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateTest() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/agent-testing/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test_type: "full_shop" }),
      });
      if (!res.ok) throw new Error("Failed to create test");
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1
            data-testid="text-landing-title"
            className="text-4xl font-bold text-gray-900 mb-4"
          >
            Agent Shopping Test
          </h1>
          <p
            data-testid="text-landing-description"
            className="text-lg text-gray-600 max-w-xl mx-auto"
          >
            Test how well your AI agent can navigate a realistic e-commerce flow — from search to checkout.
            Get scored on accuracy, speed, and decision-making.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl mb-2">1️⃣</div>
              <h3 className="font-medium text-gray-900 mb-1">Create a Test</h3>
              <p className="text-sm text-gray-500">
                Generate a unique test with a randomized shopping scenario.
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">2️⃣</div>
              <h3 className="font-medium text-gray-900 mb-1">Send to Your Agent</h3>
              <p className="text-sm text-gray-500">
                Give your agent the test URL and instructions. Watch in real-time.
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">3️⃣</div>
              <h3 className="font-medium text-gray-900 mb-1">Get Scored</h3>
              <p className="text-sm text-gray-500">
                See how your agent performed across 5 scoring dimensions.
              </p>
            </div>
          </div>
        </div>

        {!result ? (
          <div className="text-center">
            <button
              data-testid="button-create-test"
              onClick={handleCreateTest}
              disabled={loading}
              className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 text-lg"
            >
              {loading ? "Creating..." : "Create New Test"}
            </button>
            {error && (
              <p data-testid="text-error" className="mt-4 text-red-600">{error}</p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-8 space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                Test ID
              </h3>
              <code
                data-testid="text-test-id"
                className="text-lg font-mono text-gray-900 bg-gray-50 px-3 py-1.5 rounded"
              >
                {result.test_id}
              </code>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                Agent URL (give this to your agent)
              </h3>
              <div className="flex gap-2">
                <input
                  data-testid="input-test-url"
                  type="text"
                  readOnly
                  value={result.test_url}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm text-gray-900 bg-gray-50"
                />
                <button
                  data-testid="button-copy-test-url"
                  onClick={() => navigator.clipboard.writeText(result.test_url)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  Copy
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                Observer URL (watch the agent in real-time)
              </h3>
              <div className="flex gap-2">
                <input
                  data-testid="input-observe-url"
                  type="text"
                  readOnly
                  value={result.observe_url}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm text-gray-900 bg-gray-50"
                />
                <button
                  data-testid="button-copy-observe-url"
                  onClick={() => navigator.clipboard.writeText(result.observe_url)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  Copy
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                Instructions (send these to your agent)
              </h3>
              <pre
                data-testid="text-instructions"
                className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap font-mono"
              >
                {result.instructions}
              </pre>
              <button
                data-testid="button-copy-instructions"
                onClick={() => navigator.clipboard.writeText(result.instructions)}
                className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Copy Instructions
              </button>
            </div>

            <div className="pt-4 border-t border-gray-100 flex gap-4">
              <a
                data-testid="link-open-observe"
                href={result.observe_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                Open Observer View
              </a>
              <button
                data-testid="button-create-another"
                onClick={() => { setResult(null); handleCreateTest(); }}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Create Another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
