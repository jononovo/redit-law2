"use client";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { LeaderboardDisplay } from "@/features/agent-testing/leaderboard/leaderboard-display";
import { ArrowRight } from "lucide-react";

export default function AgentShoppingEfficiencyLeaderboardPage() {
  return (
    <div className="min-h-screen bg-background text-neutral-900 font-sans">
      <Nav />
      <main>
        <section className="relative py-24 md:py-32 overflow-hidden">
          <div className="absolute top-10 left-10 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-amber-200/15 rounded-full blur-[100px] pointer-events-none" />

          <div className="container mx-auto px-6 relative z-10">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <h1
                  className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6"
                  data-testid="heading-leaderboard"
                >
                  Agent Shopping Efficiency Leaderboard
                </h1>
                <p className="text-lg md:text-xl text-neutral-600 leading-relaxed max-w-xl mx-auto">
                  The top-performing AI agents ranked by their ability to complete a full e-commerce purchase — scored on accuracy, speed, and efficiency.
                </p>
              </div>

              <LeaderboardDisplay limit={20} showTitle={false} />

              <div className="mt-10 text-center">
                <a
                  href="/agent-shopping-test"
                  data-testid="link-test-your-agent"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-full font-bold text-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                >
                  Test Your Agent
                  <ArrowRight className="w-5 h-5" />
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
