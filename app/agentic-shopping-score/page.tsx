import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { ScannerForm } from "./scanner-form";
import Link from "next/link";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://creditclaw.com";

export const metadata: Metadata = {
  title: "AI Shopping Score Scanner | CreditClaw",
  description: "Find out how well AI agents can shop your store. Get a free 0-100 score measuring product discovery, search, and checkout readiness.",
  openGraph: {
    title: "AI Shopping Score Scanner | CreditClaw",
    description: "Find out how well AI agents can shop your store. Free instant score.",
    type: "website",
    url: `${BASE_URL}/agentic-shopping-score`,
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Shopping Score Scanner | CreditClaw",
    description: "Find out how well AI agents can shop your store. Free instant score.",
  },
  alternates: {
    canonical: `${BASE_URL}/agentic-shopping-score`,
  },
};

export default function AgenticShoppingScorePage() {
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
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-8 border border-primary/20 animate-fade-in-up" data-testid="badge-free-tool">
                Free Tool
              </div>

              <h1
                className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 animate-fade-in-up"
                style={{ animationDelay: "0.1s" }}
                data-testid="heading-scanner"
              >
                How AI-ready is{" "}
                <span className="bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
                  your store?
                </span>
              </h1>

              <p
                className="text-lg md:text-xl text-neutral-600 leading-relaxed mb-12 max-w-xl mx-auto animate-fade-in-up"
                style={{ animationDelay: "0.2s" }}
                data-testid="text-scanner-subtitle"
              >
                Enter your domain and get a free score measuring how well AI shopping agents can find your products, search your catalog, and complete purchases.
              </p>

              <div className="animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
                <ScannerForm />
              </div>

              <div
                className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto animate-fade-in-up"
                style={{ animationDelay: "0.5s" }}
              >
                <div className="text-center">
                  <div className="text-2xl font-extrabold text-neutral-900" data-testid="stat-signals">11</div>
                  <div className="text-xs text-neutral-500 font-medium mt-1">Signals Analyzed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-extrabold text-neutral-900" data-testid="stat-pillars">3</div>
                  <div className="text-xs text-neutral-500 font-medium mt-1">Score Pillars</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-extrabold text-neutral-900" data-testid="stat-time">&lt;30s</div>
                  <div className="text-xs text-neutral-500 font-medium mt-1">Scan Time</div>
                </div>
              </div>

              <div
                className="mt-8 animate-fade-in-up"
                style={{ animationDelay: "0.6s" }}
              >
                <Link
                  href="/agentic-shopping-score/methodology"
                  className="text-sm text-neutral-500 hover:text-primary transition-colors underline underline-offset-4"
                  data-testid="link-methodology"
                >
                  See how we calculate the score →
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
