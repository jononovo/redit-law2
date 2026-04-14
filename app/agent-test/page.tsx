"use client";

import { useState } from "react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Copy, Check, ExternalLink, Loader2, ShoppingCart, Target, Zap, Route, Clock, Brain } from "lucide-react";

interface TestResult {
  test_id: string;
  test_url: string;
  observe_url: string;
  instructions: string;
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

const SCORING_DIMENSIONS = [
  { icon: Target, label: "Instruction Following", weight: "35%", description: "Correct product, color, size, and quantity" },
  { icon: Brain, label: "Data Accuracy", weight: "25%", description: "Address and card details entered correctly" },
  { icon: Route, label: "Flow Completion", weight: "20%", description: "All 7 pages navigated successfully" },
  { icon: Clock, label: "Speed", weight: "10%", description: "Total time from start to confirmation" },
  { icon: Zap, label: "Navigation Efficiency", weight: "10%", description: "Minimal backtracking and errors" },
];

export default function AgentTestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/agent-testing/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test_type: "full_shop" }),
      });
      if (!res.ok) throw new Error("Failed to generate test");
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

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
              <div
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-8 border border-primary/20 animate-fade-in-up"
                data-testid="badge-agent-test"
              >
                <ShoppingCart className="w-4 h-4" />
                Agent Shopping Test
              </div>

              <h1
                className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 animate-fade-in-up"
                style={{ animationDelay: "0.1s" }}
                data-testid="heading-agent-test"
              >
                Can your agent{" "}
                <span className="bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
                  shop?
                </span>
              </h1>

              <p
                className="text-lg md:text-xl text-neutral-600 leading-relaxed mb-12 max-w-xl mx-auto animate-fade-in-up"
                style={{ animationDelay: "0.2s" }}
                data-testid="text-agent-test-subtitle"
              >
                Generate a test, copy the message below, and send it to your AI agent.
                Watch it navigate a real shopping flow and get scored on accuracy, speed, and decision-making.
              </p>

              {!result ? (
                <div className="animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
                  <button
                    onClick={handleGenerate}
                    disabled={loading}
                    data-testid="button-generate-test"
                    className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-full font-bold text-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-5 h-5" />
                        Generate Test
                      </>
                    )}
                  </button>
                  {error && (
                    <p data-testid="text-error" className="mt-4 text-red-600 font-medium">{error}</p>
                  )}
                </div>
              ) : (
                <div className="animate-fade-in-up text-left" style={{ animationDelay: "0.1s" }}>
                  <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 md:p-8">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-neutral-900">
                        Send this to your agent
                      </h2>
                      <CopyButton text={result.instructions} label="instructions" />
                    </div>

                    <div
                      data-testid="text-instructions"
                      className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 font-mono text-sm text-neutral-800 whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto"
                    >
                      {result.instructions}
                    </div>

                    <div className="mt-6 flex flex-col sm:flex-row gap-3">
                      <a
                        href={result.observe_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid="link-watch-agent"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Watch Your Agent Live
                      </a>
                      <button
                        onClick={() => { setResult(null); handleGenerate(); }}
                        data-testid="button-new-test"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-neutral-100 text-neutral-700 rounded-full font-semibold hover:bg-neutral-200 transition-colors"
                      >
                        Generate Another
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
      </main>
      <Footer />
    </div>
  );
}
