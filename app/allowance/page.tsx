"use client";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { AnnouncementBar } from "@/components/announcement-bar";
import { Wallet, TrendingDown, Pause, PiggyBank, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const highlights = [
  {
    icon: Wallet,
    color: "bg-orange-100 text-orange-600",
    title: "Set a daily, weekly, or monthly budget",
    description: "Pick a number your bot can spend. Per-transaction, daily, and monthly — you set all three. When it hits the limit, spending stops automatically.",
  },
  {
    icon: TrendingDown,
    color: "bg-blue-100 text-blue-600",
    title: "Real-time balance tracking",
    description: "Watch your bot spend in real time from the dashboard. Every purchase shows up instantly with amount, category, and timestamp.",
  },
  {
    icon: Pause,
    color: "bg-purple-100 text-purple-600",
    title: "Auto-freeze when funds run low",
    description: "Get alerted when the balance drops below your threshold. Or freeze the wallet instantly with one click — spending stops immediately.",
  },
];

export default function AllowancePage() {
  return (
    <div className="min-h-screen bg-background text-neutral-900 font-sans">
      <AnnouncementBar />
      <Nav />

      <main>
        <section className="pt-40 pb-24 bg-background relative overflow-hidden">
          <div className="absolute top-20 left-20 w-[500px] h-[500px] bg-pink-200/30 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />
          <div className="absolute bottom-0 right-20 w-[400px] h-[400px] bg-orange-200/30 rounded-full blur-[80px] pointer-events-none mix-blend-multiply" />

          <div className="container mx-auto px-6 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-100 text-pink-700 font-bold text-sm mb-6 animate-fade-in-up">
                  <PiggyBank size={14} />
                  <span>Prepaid, not credit</span>
                </div>
                <h1
                  className="text-5xl md:text-6xl font-extrabold tracking-tight text-neutral-900 leading-[1.1] mb-6 animate-fade-in-up"
                  style={{ animationDelay: "0.1s" }}
                  data-testid="heading-allowance"
                >
                  Give your bot an <span className="text-primary">allowance</span>, not a blank check.
                </h1>
                <p
                  className="text-xl text-neutral-500 font-medium leading-relaxed mb-8 animate-fade-in-up"
                  style={{ animationDelay: "0.2s" }}
                >
                  Fund the wallet, set the ceiling. When it&apos;s gone, it stops. No surprise bills, no runaway spending. Like giving your teenager a prepaid debit card — except smarter.
                </p>
                <div className="animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
                  <Link href="/onboarding">
                    <Button className="h-14 px-8 rounded-full text-lg font-bold gap-2" data-testid="button-get-started-allowance">
                      Get Started
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
                <div className="bg-white rounded-3xl border border-neutral-100 shadow-2xl shadow-neutral-900/5 p-8" data-testid="card-allowance-visual">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <p className="text-xs font-mono text-neutral-400 uppercase tracking-[0.2em]">Today&apos;s Budget</p>
                      <p className="text-3xl font-extrabold text-neutral-900 mt-1">$50.00</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="flex justify-between text-sm font-semibold text-neutral-500 mb-2">
                      <span>$32.50 spent</span>
                      <span>$17.50 left</span>
                    </div>
                    <div className="w-full h-4 bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-orange-400 rounded-full transition-all duration-1000" style={{ width: "65%" }} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      { label: "OpenAI API", amount: "$18.50", icon: "🧠", time: "2 min ago" },
                      { label: "Vercel Deploy", amount: "$8.00", icon: "▲", time: "1 hour ago" },
                      { label: "Domain Renewal", amount: "$6.00", icon: "🌐", time: "3 hours ago" },
                    ].map((tx, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 border border-neutral-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white border border-neutral-100 flex items-center justify-center text-lg shadow-sm">
                            {tx.icon}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-neutral-800">{tx.label}</p>
                            <p className="text-[10px] text-neutral-400 font-semibold">{tx.time}</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-neutral-800">-{tx.amount}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-400">Monthly limit: $500.00</span>
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">On track</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-[#FDFBF7] border-y border-neutral-100">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-4xl font-extrabold tracking-tight text-neutral-900 mb-4 animate-fade-in-up">
                How the <span className="text-primary">allowance</span> works.
              </h2>
              <p className="text-lg text-neutral-500 font-medium animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                You decide how much your bot can spend. We enforce it — no exceptions.
              </p>
            </div>

            <div className="max-w-4xl mx-auto space-y-8">
              {highlights.map((item, index) => (
                <div
                  key={index}
                  className="flex gap-6 items-start bg-white rounded-3xl border border-neutral-100 shadow-lg shadow-neutral-900/5 p-8 animate-fade-in-up"
                  style={{ animationDelay: `${0.2 + index * 0.1}s` }}
                  data-testid={`highlight-${index}`}
                >
                  <div className={`w-14 h-14 rounded-2xl ${item.color} flex items-center justify-center shrink-0 shadow-sm`}>
                    <item.icon size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-neutral-900 mb-2">{item.title}</h3>
                    <p className="text-neutral-500 font-medium leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 bg-background">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-extrabold text-neutral-900 mb-4 text-center animate-fade-in-up">
                The suggested flow
              </h2>
              <p className="text-neutral-500 font-medium text-center mb-12 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                Getting your bot funded takes less than two minutes.
              </p>

              <div className="space-y-6">
                {[
                  { step: "1", title: "Connect your card", desc: "Securely add your Visa, Mastercard, or Amex through Stripe." },
                  { step: "2", title: "Fund the wallet", desc: "Transfer any amount into your bot's prepaid wallet. $10, $100, $1,000 — your call." },
                  { step: "3", title: "Set daily + monthly caps", desc: "Cap daily spending at $50, monthly at $500. Your bot can never exceed these." },
                  { step: "4", title: "Pick an approval mode", desc: "Auto-approve small purchases, or require your OK for everything. You choose." },
                  { step: "5", title: "Let it run", desc: "Your bot buys what it needs. You get notified. The wallet balance updates in real time." },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-5 animate-fade-in-up"
                    style={{ animationDelay: `${0.2 + i * 0.08}s` }}
                    data-testid={`flow-step-${item.step}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                      {item.step}
                    </div>
                    <div className="pt-1">
                      <h4 className="font-bold text-neutral-900 text-lg">{item.title}</h4>
                      <p className="text-neutral-500 font-medium mt-1">{item.desc}</p>
                    </div>
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
