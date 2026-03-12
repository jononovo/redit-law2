"use client";

import Link from "next/link";
import { ShoppingCart, Shield, ArrowRight, CreditCard, CheckCircle2, Package, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const features = [
  {
    icon: ShoppingCart,
    title: "Amazon World Store",
    description: "Your bots can purchase from 1B+ Amazon products. CrossMint handles fulfillment — just provide the ASIN and shipping address.",
  },
  {
    icon: CreditCard,
    title: "Fiat Onramp Funding",
    description: "Fund wallets with your credit card. CrossMint converts fiat to USDC on Base — no crypto experience needed.",
  },
  {
    icon: CheckCircle2,
    title: "Human Approval Flow",
    description: "Every purchase requires your approval first. Review the product, price, and shipping address before the order is placed.",
  },
  {
    icon: Shield,
    title: "Merchant Guardrails",
    description: "Control which merchants your bots can buy from. Set per-transaction, daily, and monthly spending limits with merchant allow/blocklists.",
  },
  {
    icon: Package,
    title: "CrossMint Smart Wallets",
    description: "Each bot gets a smart wallet on Base chain. CrossMint handles gas fees and key management — fully gasless transactions.",
  },
  {
    icon: Truck,
    title: "Order Tracking",
    description: "Track every purchase from approval through shipping to delivery. Full visibility into your bots' commerce activity.",
  },
];

export default function CardWalletLanding() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-neutral-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/images/logo-claw-chip.png" alt="CreditClaw" width={32} height={32} />
            <span className="font-bold text-lg tracking-tight">CreditClaw</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/card-wallet">
              <Button variant="outline" className="rounded-full" data-testid="button-dashboard-cta">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <ShoppingCart className="w-4 h-4" />
            Rail 2 — Commerce Purchases
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-neutral-900 leading-tight mb-6" data-testid="text-hero-title">
            Let your bots buy<br />
            <span className="text-violet-600">real products</span>
          </h1>
          <p className="text-xl text-neutral-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Fund smart wallets with USDC. Your AI bots request purchases on Amazon —
            you approve, CrossMint handles fulfillment. Full spending controls, full visibility.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/card-wallet">
              <Button size="lg" className="rounded-full bg-violet-600 hover:bg-violet-700 text-white px-8 gap-2 shadow-lg shadow-violet-600/20" data-testid="button-get-started">
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="rounded-full px-8" data-testid="button-learn-more">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-8 border-y border-neutral-100 bg-neutral-50">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-center gap-12 text-sm text-neutral-400">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-violet-400" />
            Base Chain (L2)
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            USDC Stablecoin
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-400" />
            CrossMint
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            Amazon World Store
          </div>
        </div>
      </section>

      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-neutral-900 mb-4">Built for bot-to-commerce purchases</h2>
            <p className="text-neutral-500 max-w-xl mx-auto">
              Everything your bots need to buy real products autonomously, with the approval flow you need to stay in control.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-neutral-100 p-6 hover:shadow-lg hover:border-violet-100 transition-all"
                data-testid={`card-feature-${i}`}
              >
                <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-violet-600" />
                </div>
                <h3 className="font-bold text-neutral-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-neutral-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to let your bots shop?</h2>
          <p className="text-neutral-400 max-w-xl mx-auto mb-8">
            Create a Card Wallet, set your guardrails, and let your bots purchase products with your approval.
          </p>
          <Link href="/card-wallet">
            <Button size="lg" className="rounded-full bg-violet-600 hover:bg-violet-700 px-8 gap-2" data-testid="button-cta-bottom">
              Open Dashboard
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-neutral-100 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-neutral-400">
          <span>CreditClaw — Multi-rail payments for AI bots</span>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-neutral-600">Home</Link>
            <Link href="/overview" className="hover:text-neutral-600">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
