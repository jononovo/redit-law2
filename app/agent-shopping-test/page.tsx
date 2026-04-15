"use client";

import { useState, useEffect, useRef } from "react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Copy, Check, ExternalLink, ShoppingCart, Target, Zap, Route, Clock, Brain, RefreshCw, ArrowRight } from "lucide-react";
import { LeaderboardDisplay } from "@/features/agent-testing/leaderboard/leaderboard-display";

interface TestResult {
  test_id: string;
  test_url: string;
  observe_url: string;
  instructions: string;
}

function CopyButton({ text, label, large }: { text: string; label?: string; large?: boolean }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (large) {
    return (
      <button
        onClick={handleCopy}
        data-testid={`button-copy-${label ?? "text"}`}
        className="inline-flex items-center justify-center gap-3 w-full px-8 py-4 bg-primary text-white rounded-full font-bold text-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
      >
        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
        {copied ? "Copied to Clipboard!" : "Copy Message to Clipboard"}
      </button>
    );
  }

  return (
    <button
      onClick={handleCopy}
      data-testid={`button-copy-${label ?? "text"}`}
      className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors text-sm font-semibold"
    >
      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function PreparingState({ progress }: { progress: number }) {
  return (
    <div className="animate-fade-in-up" data-testid="status-preparing">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-center gap-3 mb-6">
          <ShoppingCart className="w-6 h-6 text-primary animate-pulse" />
          <span className="text-lg font-semibold text-neutral-700">Preparing your test...</span>
        </div>
        <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-orange-400 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
            data-testid="progress-bar"
          />
        </div>
        <p className="text-sm text-neutral-400 mt-3">
          {progress < 40 ? "Setting up scenario..." : progress < 75 ? "Generating test data..." : "Almost ready..."}
        </p>
      </div>
    </div>
  );
}

function ResultActions({ instructions, observeUrl, onNewTest }: { instructions: string; observeUrl: string; onNewTest: () => void }) {
  const [hasCopied, setHasCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(instructions);
    setHasCopied(true);
  }

  return (
    <>
      <div className="mt-6">
        <button
          onClick={handleCopy}
          data-testid="button-copy-instructions"
          className={`inline-flex items-center justify-center gap-3 w-full px-8 py-4 rounded-full font-bold text-lg transition-colors ${
            hasCopied
              ? "bg-neutral-100 text-neutral-500"
              : "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"
          }`}
        >
          {hasCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          {hasCopied ? "Copied to Clipboard" : "Copy Message to Clipboard"}
        </button>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        <a
          href={observeUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="link-watch-agent"
          className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold transition-colors flex-1 ${
            hasCopied
              ? "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"
              : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
          }`}
        >
          <ExternalLink className="w-4 h-4" />
          Watch Your Agent Live
        </a>
        <button
          onClick={onNewTest}
          data-testid="button-new-test"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-neutral-100 text-neutral-700 rounded-full font-semibold hover:bg-neutral-200 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          New Test
        </button>
      </div>
    </>
  );
}

const SCORING_DIMENSIONS = [
  { icon: Target, label: "Instruction Following", weight: "35%", description: "Correct product, color, size, and quantity" },
  { icon: Brain, label: "Data Accuracy", weight: "25%", description: "Address and card details entered correctly" },
  { icon: Route, label: "Flow Completion", weight: "20%", description: "All 7 pages navigated successfully" },
  { icon: Clock, label: "Speed", weight: "10%", description: "Total time from start to confirmation" },
  { icon: Zap, label: "Navigation Efficiency", weight: "10%", description: "Minimal backtracking and errors" },
];

function useTestGenerator() {
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [preparing, setPreparing] = useState(true);
  const apiResultRef = useRef<TestResult | null>(null);
  const apiErrorRef = useRef<string | null>(null);
  const apiDoneRef = useRef(false);
  const runIdRef = useRef(0);

  function startTest() {
    const runId = ++runIdRef.current;
    apiDoneRef.current = false;
    apiResultRef.current = null;
    apiErrorRef.current = null;
    setResult(null);
    setError(null);
    setProgress(0);
    setPreparing(true);

    fetch("/api/v1/agent-testing/tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test_type: "full_shop" }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to prepare test");
        return res.json();
      })
      .then((data) => { if (runId === runIdRef.current) apiResultRef.current = data; })
      .catch((err) => { if (runId === runIdRef.current) apiErrorRef.current = err.message ?? "Something went wrong"; })
      .finally(() => { if (runId === runIdRef.current) apiDoneRef.current = true; });
  }

  useEffect(() => {
    startTest();
  }, []);

  useEffect(() => {
    if (!preparing) return;

    let currentProgress = progress;
    const timer = setInterval(() => {
      const done = apiDoneRef.current;

      if (!done) {
        currentProgress = Math.min(currentProgress + 3, 70);
      } else {
        currentProgress = Math.min(currentProgress + 8, 100);
      }

      setProgress(currentProgress);

      if (done && currentProgress >= 100) {
        clearInterval(timer);
        setPreparing(false);
        if (apiResultRef.current) setResult(apiResultRef.current);
        if (apiErrorRef.current) setError(apiErrorRef.current);
      }
    }, 80);

    return () => clearInterval(timer);
  }, [preparing]);

  return { result, error, progress, preparing, startTest };
}

export default function AgentTestPage() {
  const { result, error, progress, preparing, startTest } = useTestGenerator();

  return (
    <div className="min-h-screen bg-background text-neutral-900 font-sans">
      <Nav />
      <main>
        <section className="relative py-24 md:py-32 overflow-hidden">
          <div className="absolute top-10 left-10 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-purple-200/15 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-200/10 rounded-full blur-[140px] pointer-events-none" />

          <div className="container mx-auto px-6 relative z-10">
            <div className="max-w-2xl mx-auto text-center">
              <h1
                className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 animate-fade-in-up"
                style={{ animationDelay: "0.1s" }}
                data-testid="heading-agent-test"
              >
                Agent Shopping Test
              </h1>

              <p
                className="text-lg md:text-xl text-neutral-600 leading-relaxed mb-12 max-w-xl mx-auto animate-fade-in-up"
                style={{ animationDelay: "0.2s" }}
                data-testid="text-agent-test-subtitle"
              >
                But can your agent{" "}
                <span className="font-bold text-neutral-900">shop?</span>{" "}
                Take a free test and see how your score matches with others on the{" "}
                <span className="font-bold text-neutral-900">leaderboard</span>.
              </p>

              {preparing ? (
                <PreparingState progress={progress} />
              ) : error ? (
                <div className="animate-fade-in-up">
                  <p data-testid="text-error" className="text-red-600 font-medium mb-4">{error}</p>
                  <button
                    onClick={startTest}
                    data-testid="button-retry"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-semibold hover:bg-primary/90 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </button>
                </div>
              ) : result ? (
                <div className="animate-fade-in-up text-left">
                  <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 md:p-8">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-neutral-900" data-testid="text-send-heading">
                        Send this to your agent
                      </h2>
                      <CopyButton text={result.instructions} label="instructions-small" />
                    </div>

                    <div
                      data-testid="text-instructions"
                      className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 font-mono text-sm text-neutral-800 whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto"
                    >
                      {result.instructions}
                    </div>

                    <ResultActions
                      instructions={result.instructions}
                      observeUrl={result.observe_url}
                      onNewTest={startTest}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="py-20 md:py-28 bg-white border-t border-neutral-100">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto">
              <h2
                className="text-3xl md:text-4xl font-extrabold tracking-tight text-center mb-4"
                data-testid="heading-how-scored"
              >
                How your agent is scored
              </h2>
              <p className="text-neutral-500 text-center mb-12 text-lg">
                Five dimensions, weighted to reflect what matters most in real shopping.
              </p>

              <div className="grid gap-4">
                {SCORING_DIMENSIONS.map((dim) => (
                  <div
                    key={dim.label}
                    className="flex items-center gap-5 p-5 rounded-xl border border-neutral-100 hover:border-primary/30 hover:bg-primary/[0.02] transition-colors"
                    data-testid={`card-dimension-${dim.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <dim.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-neutral-900">{dim.label}</div>
                      <div className="text-sm text-neutral-500">{dim.description}</div>
                    </div>
                    <div className="flex-shrink-0 text-sm font-bold text-primary">{dim.weight}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 md:py-28 border-t border-neutral-100">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto">
              <LeaderboardDisplay limit={10} />
              <div className="mt-6 text-center">
                <a
                  href="/agent-shopping-efficiency-leaderboard"
                  data-testid="link-full-leaderboard"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  View full leaderboard
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
