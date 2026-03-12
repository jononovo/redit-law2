import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { AnnouncementBar } from "@/components/announcement-bar";
import { CreditCard, SlidersHorizontal, ShoppingCart, Sparkles } from "lucide-react";

const steps = [
  {
    num: "01",
    icon: CreditCard,
    color: "bg-orange-100 text-orange-600",
    title: "Add your card",
    description: "Connect any Visa, Mastercard, or Amex. Stripe handles the security — we never touch your card number. Setup takes under 60 seconds.",
  },
  {
    num: "02",
    icon: SlidersHorizontal,
    color: "bg-blue-100 text-blue-600",
    title: "Set the rules",
    description: "Per-transaction caps, daily budgets, monthly limits, blocked categories. Your bot can only spend what you allow. Change the rules anytime from your dashboard.",
  },
  {
    num: "03",
    icon: ShoppingCart,
    color: "bg-green-100 text-green-600",
    title: "Your bot shops",
    description: "Your AI agent buys what it needs within your guardrails. Every transaction is logged and visible in real time. You get notified on every purchase.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background text-neutral-900 font-sans">
      <AnnouncementBar />
      <Nav />

      <main>
        <section className="pt-40 pb-24 bg-background relative overflow-hidden">
          <div className="absolute top-20 right-20 w-[500px] h-[500px] bg-blue-200/30 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />
          <div className="absolute bottom-20 left-20 w-[400px] h-[400px] bg-orange-200/30 rounded-full blur-[80px] pointer-events-none mix-blend-multiply" />

          <div className="container mx-auto px-6 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 font-bold text-sm mb-6 animate-fade-in-up">
                <CreditCard size={14} />
                <span>Simple, powerful, transparent</span>
              </div>
              <h1
                className="text-5xl md:text-7xl font-extrabold tracking-tight text-neutral-900 leading-[1.1] mb-6 animate-fade-in-up"
                style={{ animationDelay: "0.1s" }}
                data-testid="heading-how-it-works"
              >
                How <span className="text-primary">CreditClaw</span> works.
              </h1>
              <p
                className="text-xl text-neutral-500 font-medium max-w-2xl mx-auto leading-relaxed animate-fade-in-up"
                style={{ animationDelay: "0.2s" }}
              >
                You add your own credit card. You set strict spending limits. Your bot spends within those limits. Three steps, full control.
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-8">
              {steps.map((step, index) => (
                <div
                  key={step.num}
                  className="relative flex gap-8 items-start animate-fade-in-up"
                  style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                  data-testid={`step-${step.num}`}
                >
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`w-16 h-16 rounded-2xl ${step.color} flex items-center justify-center shadow-sm`}>
                      <step.icon size={28} />
                    </div>
                    {index < steps.length - 1 && (
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

        <section className="py-20 bg-[#FDFBF7] border-y border-neutral-100">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto">
              <div
                className="bg-white rounded-3xl border border-neutral-100 shadow-xl shadow-neutral-900/5 p-8 md:p-12 animate-fade-in-up"
                data-testid="card-rails-roadmap"
              >
                <div className="flex items-start gap-6 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 shadow-sm">
                    <Sparkles size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-extrabold text-neutral-900 mb-2">
                      Multiple rails. One platform.
                    </h3>
                    <p className="text-neutral-500 font-medium leading-relaxed">
                      CreditClaw gives your bot different ways to transact &mdash; all with the same guardrails and spending controls you set.
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-green-50 border border-green-100">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 font-bold text-xs shrink-0 mt-0.5">
                      Live
                    </div>
                    <div>
                      <p className="font-bold text-neutral-900">Self-Hosted Cards</p>
                      <p className="text-sm text-neutral-500 font-medium">Add your own card with split-knowledge privacy. Full spending controls, human approval workflows, and obfuscation built in.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-blue-50 border border-blue-100">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-bold text-xs shrink-0 mt-0.5">
                      Waitlist
                    </div>
                    <div>
                      <p className="font-bold text-neutral-900">Bot Wallets</p>
                      <p className="text-sm text-neutral-500 font-medium">Fund a wallet for your bot and let it spend within your limits. Join the waitlist to be first in line.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-purple-50 border border-purple-100">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 font-bold text-xs shrink-0 mt-0.5">
                      Next
                    </div>
                    <div>
                      <p className="font-bold text-neutral-900">x402 Payments</p>
                      <p className="text-sm text-neutral-500 font-medium">Pay-per-request HTTP payments for AI agents. The future of bot-to-service transactions.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-background">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-extrabold text-neutral-900 mb-4 animate-fade-in-up">
                What happens under the hood
              </h2>
              <p className="text-neutral-500 font-medium mb-12 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                Every purchase goes through multiple safety checks before money moves.
              </p>

              <div className="grid md:grid-cols-2 gap-6 text-left">
                {[
                  { title: "Wallet balance check", desc: "Does the bot have enough funds for this purchase?" },
                  { title: "Spending limit enforcement", desc: "Is this within the per-transaction, daily, and monthly caps?" },
                  { title: "Category filtering", desc: "Is this purchase in an allowed category, or is it blocked?" },
                  { title: "Approval routing", desc: "Does this need owner approval, or is it auto-approved under the threshold?" },
                  { title: "Atomic debit", desc: "Funds are deducted atomically — no double-spending, no race conditions." },
                  { title: "Instant logging", desc: "Transaction recorded, webhook fired, owner notified — all in real time." },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="p-6 rounded-2xl bg-neutral-50 border border-neutral-100 animate-fade-in-up"
                    style={{ animationDelay: `${0.2 + i * 0.05}s` }}
                    data-testid={`check-${i}`}
                  >
                    <h4 className="font-bold text-neutral-900 mb-1">{item.title}</h4>
                    <p className="text-sm text-neutral-500 font-medium">{item.desc}</p>
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
