"use client";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { Search, FileText, Download, ShoppingCart, CheckCircle2, ArrowRight } from "lucide-react";

const STEPS = [
  {
    num: "01",
    icon: Search,
    color: "bg-blue-50 text-blue-600",
    title: "Search the registry",
    description: "Your AI agent searches brands.sh for a vendor that sells what it needs. Filter by sector, checkout method, or capabilities.",
  },
  {
    num: "02",
    icon: FileText,
    color: "bg-purple-50 text-purple-600",
    title: "Download the skill",
    description: "Each brand has a SKILL.md — a machine-readable file that teaches agents how to search products, add to cart, and complete checkout at that store.",
  },
  {
    num: "03",
    icon: Download,
    color: "bg-green-50 text-green-600",
    title: "Install via CLI",
    description: "Run `npx brands add amazon` to install skills locally. Skills are versioned, dependency-free, and work with any LLM framework.",
  },
  {
    num: "04",
    icon: ShoppingCart,
    color: "bg-orange-50 text-orange-600",
    title: "Agent shops autonomously",
    description: "With the skill installed, your agent knows the exact steps to browse, search, and buy from that store — including payment flows, error handling, and edge cases.",
  },
];

const WHAT_SKILLS_CONTAIN = [
  { title: "Product search instructions", desc: "How to find products — site search, category navigation, URL patterns." },
  { title: "Cart and checkout flow", desc: "Step-by-step instructions for adding items, entering shipping, and paying." },
  { title: "Payment methods", desc: "Which payment rails the store accepts — card, PayPal, purchase orders, etc." },
  { title: "Error handling", desc: "What to do when items are out of stock, carts expire, or checkout fails." },
  { title: "Bot tolerance level", desc: "Whether the store blocks automated access, requires CAPTCHAs, or has rate limits." },
  { title: "ASX Score breakdown", desc: "11 agent-readiness signals scored across clarity, discoverability, and reliability." },
];

export default function BrandsHowItWorks() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans">
      <Nav />

      <main>
        <section className="pt-32 pb-20 relative overflow-hidden">
          <div className="absolute top-20 right-20 w-[400px] h-[400px] bg-blue-100/30 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-purple-100/20 rounded-full blur-[80px] pointer-events-none" />

          <div className="container mx-auto px-6 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-neutral-100 text-neutral-600 font-semibold text-sm mb-6" data-testid="badge-subtitle">
                <span className="w-2 h-2 rounded-full bg-neutral-900" />
                The skill registry for AI shopping agents
              </div>
              <h1
                className="text-5xl md:text-7xl font-extrabold tracking-tight text-neutral-900 leading-[1.05] mb-6"
                data-testid="heading-how-it-works"
              >
                How <span className="text-neutral-400">brands.sh</span> works.
              </h1>
              <p className="text-xl text-neutral-500 font-medium max-w-2xl mx-auto leading-relaxed">
                Agents need instructions to shop. brands.sh is the registry where they find them —
                structured skill files for every verified store.
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-8">
              {STEPS.map((step, index) => (
                <div
                  key={step.num}
                  className="relative flex gap-8 items-start"
                  data-testid={`step-${step.num}`}
                >
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`w-16 h-16 rounded-2xl ${step.color} flex items-center justify-center shadow-sm`}>
                      <step.icon size={28} />
                    </div>
                    {index < STEPS.length - 1 && (
                      <div className="w-px h-16 bg-neutral-200 mt-4" />
                    )}
                  </div>
                  <div className="pt-1">
                    <span className="text-xs font-mono text-neutral-400 uppercase tracking-[0.2em]">Step {step.num}</span>
                    <h3 className="text-2xl font-extrabold text-neutral-900 mt-1 mb-3">{step.title}</h3>
                    <p className="text-neutral-500 font-medium leading-relaxed text-lg">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-neutral-50 border-y border-neutral-200">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-extrabold text-neutral-900 mb-3" data-testid="heading-whats-in-a-skill">
                  What&apos;s inside a skill?
                </h2>
                <p className="text-neutral-500 font-medium">
                  Each SKILL.md is a complete instruction set for one store.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {WHAT_SKILLS_CONTAIN.map((item, i) => (
                  <div key={i} className="p-5 rounded-xl bg-white border border-neutral-200" data-testid={`card-skill-content-${i}`}>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-neutral-400 mt-0.5 shrink-0" />
                      <div>
                        <h4 className="font-bold text-neutral-900 mb-1 text-sm">{item.title}</h4>
                        <p className="text-xs text-neutral-500 font-medium leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-extrabold text-neutral-900 mb-4" data-testid="heading-cta">
                Start browsing the registry.
              </h2>
              <p className="text-lg text-neutral-500 font-medium mb-10 max-w-xl mx-auto">
                Find the right brand skill for your agent. Search by sector, compare scores, and install in seconds.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/skills" data-testid="link-browse-catalog">
                  <span className="inline-flex items-center gap-2 h-14 px-8 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 font-bold text-base transition-colors">
                    Browse Skills
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>
                <Link href="/agentic-shopping-score" data-testid="link-check-score">
                  <span className="inline-flex items-center gap-2 h-14 px-8 rounded-xl border border-neutral-300 hover:bg-neutral-50 font-bold text-base text-neutral-900 transition-colors">
                    Check a Score
                    <ArrowRight className="w-4 h-4" />
                  </span>
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
