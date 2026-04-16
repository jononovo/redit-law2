"use client";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, Globe, ShoppingBag, Sparkles, Target, Layers, Zap, BookOpen } from "lucide-react";
import { AgentConvergenceModern } from "@/components/agent-convergence-modern";

const services = [
  {
    icon: Bot,
    color: "bg-orange-100 text-orange-600",
    title: "Master Agent Building",
    description: "We design, build and deploy custom shopping agents tailored to your brand's catalog, pricing rules and vendor relationships.",
  },
  {
    icon: ShoppingBag,
    color: "bg-pink-100 text-pink-600",
    title: "Shopping Agent Management",
    description: "Ongoing management and optimization of your agentic shopping infrastructure — monitoring, tuning and scaling as your needs grow.",
  },
  {
    icon: Sparkles,
    color: "bg-purple-100 text-purple-600",
    title: "Agentic Shopping for Claude, Perplexity & ChatGPT",
    description: "Enable the leading AI platforms to discover, evaluate and purchase from your brand natively through their interfaces.",
  },
  {
    icon: Target,
    color: "bg-blue-100 text-blue-600",
    title: "AEO & Incoming Agentic Purchasing",
    description: "We manage your Agent Engine Optimization — making sure AI agents can find you, understand your offerings, and transact with you.",
  },
  {
    icon: Globe,
    color: "bg-green-100 text-green-600",
    title: "Make Your Brand Agent-Friendly",
    description: "Full audit and implementation to ensure your brand is discoverable, parseable and purchasable by any AI agent in the ecosystem.",
  },
  {
    icon: Layers,
    color: "bg-yellow-100 text-yellow-600",
    title: "Product Feed for Agents",
    description: "Make your product feed public, structured and usable by agents — so they can recommend, compare and purchase your products.",
  },
  {
    icon: BookOpen,
    color: "bg-indigo-100 text-indigo-600",
    title: "Skill Building & Management",
    description: "Create and manage agent skills — the capabilities that let AI agents interact with your brand, products and services programmatically.",
  },
];

export default function ManagedAgentsPage() {
  return (
    <div className="min-h-screen bg-background text-neutral-900 font-sans">
      <Nav />
      <main>
        <section className="relative pt-32 pb-24 overflow-hidden">
          <div className="absolute top-20 right-20 w-[600px] h-[600px] bg-orange-200/30 rounded-full blur-[120px] pointer-events-none mix-blend-multiply" />
          <div className="absolute bottom-20 left-20 w-[400px] h-[400px] bg-blue-200/30 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />

          <div className="container mx-auto px-6 relative z-10">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100 text-orange-700 font-bold text-sm mb-6 animate-fade-in-up">
                <Zap size={14} />
                <span>Managed Agentic Brand Experiences</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-neutral-900 leading-[1.1] mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }} data-testid="text-managed-heading">
                Ace your brand's <span className="text-primary">agent-facing</span> touch-points.
              </h1>
              <p className="text-xl text-neutral-500 font-medium leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                Tired of the AI-Hype, but need to show results that increase brand awareness & sales?
              </p>
            </div>

            <div className="max-w-5xl mx-auto mb-20">
              <div className="rounded-3xl bg-white border border-neutral-100 shadow-sm p-6 md:p-10">
                <AgentConvergenceModern />
              </div>
              <p className="text-lg text-neutral-400 font-medium mt-6 text-center max-w-3xl mx-auto">
                Drive more traffic, partners and sales without complex interfaces.
              </p>
            </div>

            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-extrabold tracking-tight text-neutral-900 text-center mb-12" data-testid="text-what-we-do">
                What we <span className="text-primary">do</span>.
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service, i) => (
                  <div
                    key={i}
                    className="p-8 rounded-3xl bg-white hover:shadow-xl transition-all duration-300 border border-neutral-100 group"
                    data-testid={`card-managed-service-${i}`}
                  >
                    <div className={`w-14 h-14 rounded-2xl ${service.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm`}>
                      <service.icon size={28} />
                    </div>
                    <h3 className="text-lg font-bold text-neutral-900 mb-3">{service.title}</h3>
                    <p className="text-neutral-500 font-medium leading-relaxed text-sm">{service.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="max-w-2xl mx-auto text-center mt-20">
              <div className="bg-white rounded-3xl border border-neutral-100 shadow-xl shadow-neutral-900/5 p-12">
                <h3 className="text-2xl font-extrabold text-neutral-900 mb-4" data-testid="text-cta-heading">
                  Ready to make your brand <span className="text-primary">agent-ready</span>?
                </h3>
                <p className="text-neutral-500 font-medium mb-8 max-w-md mx-auto">
                  Book a quick call and we&apos;ll walk you through how agents can discover, interact with, and purchase from your brand.
                </p>
                <Button
                  className="h-14 px-8 rounded-full text-lg font-bold gap-2"
                  data-testid="link-managed-book-call"
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
                <a
                  href="https://shopy.sh/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-5 text-sm text-neutral-500 hover:text-primary transition-colors"
                  data-testid="link-brand-scan"
                >
                  Take a test &amp; check how <em>agent-friendly</em> your brand is →
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
