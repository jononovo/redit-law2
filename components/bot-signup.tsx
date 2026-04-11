"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditCard, Bot, User, Copy, Check, Shield, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SKILL_URL = "https://creditclaw.com/SKILL.md";

const steps = [
  { num: "1", text: "Send this URL to your agent" },
  { num: "2", text: "They register & give you a claim token" },
  { num: "3", text: "Claim your bot and add a payment method" },
  { num: "4", text: "Bot gets guardrails & encrypted version of your credit card." },
];

export function BotSignup() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [claimToken, setClaimToken] = useState("");

  const handleCopy = () => {
    navigator.clipboard.writeText(SKILL_URL);
    setCopied(true);
    toast({ title: "Copied!", description: "Skill URL copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClaim = (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimToken.trim()) return;
    toast({
      title: "Coming soon!",
      description: "Bot claiming will be available at launch.",
    });
  };

  return (
    <section id="how-it-works" className="py-24 bg-background relative">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 font-bold text-sm mb-6">
            <CreditCard size={14} />
            <span>Get started in 60 seconds</span>
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight text-neutral-900 mb-4">
            Give your AI agent a <span className="text-primary">wallet</span>.
          </h2>
          <p className="text-lg text-neutral-500 font-medium">
            Your bot signs up, you fund it. It&apos;s that simple.
          </p>
        </div>

        <div className="max-w-xl mx-auto">
          <Tabs defaultValue="human" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-14 rounded-2xl bg-neutral-100 p-1.5 mb-8">
              <TabsTrigger
                value="human"
                className="rounded-xl h-full text-sm font-bold gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-neutral-900 transition-all"
                data-testid="tab-human"
              >
                <User className="w-4 h-4" />
                I&apos;m a Human
              </TabsTrigger>
              <TabsTrigger
                value="bot"
                className="rounded-xl h-full text-sm font-bold gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-neutral-900 transition-all"
                data-testid="tab-bot"
              >
                <Bot className="w-4 h-4" />
                I&apos;m a Bot
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bot" className="mt-0">
              <div className="bg-white rounded-3xl border border-neutral-100 shadow-xl shadow-neutral-900/5 p-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-extrabold text-neutral-900 mb-2">
                    Give Your AI Agent a Wallet <span className="text-2xl">💳</span>
                  </h3>
                  <p className="text-neutral-500 font-medium text-sm">
                    Send the skill file URL to your agent. They&apos;ll handle the rest.
                  </p>
                </div>

                <div
                  className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-2xl p-2 mb-8 group hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={handleCopy}
                  data-testid="button-copy-skill-url"
                >
                  <div className="flex-1 px-4 py-2">
                    <code className="text-sm font-mono text-neutral-700 select-all">
                      {SKILL_URL}
                    </code>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl h-10 w-10 shrink-0 text-neutral-400 group-hover:text-primary transition-colors"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                <div className="space-y-4">
                  {steps.map((step) => (
                    <div key={step.num} className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">
                        {step.num}
                      </div>
                      <p className="text-neutral-700 font-medium text-[15px] pt-1">
                        {step.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="human" className="mt-0">
              <div className="bg-white rounded-3xl border border-neutral-100 shadow-xl shadow-neutral-900/5 p-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-extrabold text-neutral-900 mb-2">
                    Claim Your Bot&apos;s Wallet
                  </h3>
                  <p className="text-neutral-500 font-medium text-sm max-w-sm mx-auto">
                    Enter the claim token your bot gave you. You&apos;ll add a payment method and set spending limits.
                  </p>
                </div>

                <form onSubmit={handleClaim} className="space-y-4 mb-6">
                  <Input
                    placeholder="e.g. coral-X9K2"
                    value={claimToken}
                    onChange={(e) => setClaimToken(e.target.value)}
                    className="h-14 text-center text-lg font-mono rounded-2xl bg-neutral-50 border-neutral-200 placeholder:text-neutral-300 focus-visible:ring-primary"
                    data-testid="input-claim-token"
                  />
                  <Button
                    type="submit"
                    className="w-full h-14 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-base gap-2 shadow-lg shadow-neutral-900/10"
                    data-testid="button-claim-activate"
                  >
                    Claim & Activate
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </form>

                <div className="flex items-center justify-center gap-2 text-xs text-neutral-400 font-medium">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Payment details are handled securely by Stripe. CreditClaw never sees your card number.</span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
}
