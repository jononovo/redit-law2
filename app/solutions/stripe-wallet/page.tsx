"use client";

import Link from "next/link";
import { Wallet, Shield, Zap, ArrowRight, Globe, Lock, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const features = [
  {
    icon: Wallet,
    title: "Privy Server Wallets",
    description: "Each bot gets its own self-custodial wallet on Base chain. Keys are managed by Privy's MPC infrastructure — never exposed.",
  },
  {
    icon: Zap,
    title: "x402 Payment Protocol",
    description: "Bots pay for API resources with a single HTTP header. EIP-712 signed USDC transfer authorizations, verified on-chain.",
  },
  {
    icon: Globe,
    title: "Stripe Crypto Onramp",
    description: "Fund wallets with fiat via Stripe. Credit card, bank transfer, or Apple Pay → USDC on Base. No crypto experience needed.",
  },
  {
    icon: Shield,
    title: "Spending Guardrails",
    description: "Set per-transaction limits, daily and monthly budgets, domain allow/blocklists, and approval thresholds for large payments.",
  },
  {
    icon: Lock,
    title: "Owner Approval Flow",
    description: "Payments above your threshold require manual approval. Bots queue the request, you approve or reject in your dashboard.",
  },
  {
    icon: Activity,
    title: "Real-Time Activity",
    description: "Full transaction history, spending analytics, and instant notifications for every x402 payment your bots make.",
  },
];

export default function StripeWalletLanding() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-neutral-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/images/logo-claw-chip.png" alt="CreditClaw" width={32} height={32} />
            <span className="font-bold text-lg tracking-tight">CreditClaw</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/stripe-wallet">
              <Button variant="outline" className="rounded-full" data-testid="button-dashboard-cta">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Wallet className="w-4 h-4" />
            Rail 1 — Crypto-Native Payments
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-neutral-900 leading-tight mb-6" data-testid="text-hero-title">
            USDC wallets for<br />
            <span className="text-blue-600">autonomous bots</span>
          </h1>
          <p className="text-xl text-neutral-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Fund your AI bots with USDC on Base. They pay for API resources via the x402 protocol — 
            with guardrails you control. No cards, no intermediaries, just on-chain payments.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/stripe-wallet">
              <Button size="lg" className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-8 gap-2 shadow-lg shadow-blue-600/20" data-testid="button-get-started">
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
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            Base Chain (L2)
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            USDC Stablecoin
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-400" />
            EIP-712 Signatures
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            Stripe Onramp
          </div>
        </div>
      </section>

      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-neutral-900 mb-4">Built for bot-to-service payments</h2>
            <p className="text-neutral-500 max-w-xl mx-auto">
              Everything your bots need to pay for API resources autonomously, with the guardrails you need to stay in control.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-neutral-100 p-6 hover:shadow-lg hover:border-blue-100 transition-all"
                data-testid={`card-feature-${i}`}
              >
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-blue-600" />
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
          <h2 className="text-3xl font-bold mb-4">Ready to fund your bots?</h2>
          <p className="text-neutral-400 max-w-xl mx-auto mb-8">
            Create a Stripe Wallet, set your guardrails, and let your bots pay for resources autonomously.
          </p>
          <Link href="/stripe-wallet">
            <Button size="lg" className="rounded-full bg-blue-600 hover:bg-blue-700 px-8 gap-2" data-testid="button-cta-bottom">
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
