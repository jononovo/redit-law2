"use client";

import { ArrowRight, Building2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentConvergenceModern } from "@/components/agent-convergence-modern";

const services = [
  "Master agent building",
  "Shopping agent management",
  "Agentic shopping for Claude, Perplexity & ChatGPT",
  "AEO management & incoming agentic purchasing",
  "Make your brand agent-friendly",
  "Make your product feed public and usable to agents",
  "Skill building & management",
];

export function EnterpriseCta() {
  return (
    <section className="py-24 bg-gradient-to-b from-white to-neutral-50 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-100/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-100/30 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100 text-orange-700 font-bold text-sm mb-6">
            <Building2 size={14} />
            <span>For Enterprise & Brands</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-neutral-900 mb-6" data-testid="text-enterprise-heading">
            Ace your brand's <span className="text-primary">agent-facing</span> touch-points.
          </h2>
          <p className="text-lg text-neutral-500 font-medium leading-relaxed max-w-2xl mx-auto">
            Tired of the AI-Hype, but need to show results that increase brand awareness & sales?
          </p>
          <p className="text-base text-neutral-400 font-medium mt-4">
            Drive more traffic, partners and sales without complex interfaces.
          </p>
        </div>

        <div className="rounded-3xl bg-white border border-neutral-100 shadow-sm p-6 md:p-10 mb-16">
          <AgentConvergenceModern />
        </div>

        <div className="max-w-3xl mx-auto">
          <h3 className="text-2xl font-extrabold text-neutral-900 text-center mb-8" data-testid="text-services-heading">
            Our Managed Services
          </h3>
          <div className="grid sm:grid-cols-2 gap-4 mb-10">
            {services.map((service, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-neutral-50 border border-neutral-100" data-testid={`text-service-${i}`}>
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={12} />
                </div>
                <p className="text-neutral-700 font-medium text-sm">{service}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Button
              className="h-14 px-8 rounded-full text-lg font-bold gap-2"
              data-testid="link-book-call"
              asChild
            >
              <a
                href="https://calendly.com/jonathan-code/quick-call"
                target="_blank"
                rel="noopener noreferrer"
              >
                Book a Call
                <ArrowRight className="w-5 h-5" />
              </a>
            </Button>
          </div>
        </div>

        <div className="text-center">
          <a
            href="/managed-agents"
            className="text-sm text-neutral-400 hover:text-primary transition-colors font-medium"
            data-testid="link-learn-more-managed"
          >
            Learn more about our managed agent services →
          </a>
        </div>
      </div>
    </section>
  );
}
