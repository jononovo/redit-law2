"use client";

import { ArrowRight, ArrowLeft, Shield, Lock, Download, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { wt } from "@/lib/wizard-typography";

interface HowItWorksProps {
  onBack?: () => void;
  onNext: () => void;
}

export function HowItWorks({ onBack, onNext }: HowItWorksProps) {
  return (
    <div className="space-y-6" data-testid="r5-step-explanation">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
          <Shield className="w-6 h-6 text-emerald-600" />
        </div>
        <h2 className={wt.title}>How It Works</h2>
      </div>

      <div className="bg-emerald-50 rounded-xl p-5 space-y-3">
        <p className={`${wt.body} text-neutral-700 leading-relaxed`}>
          <strong>CreditClaw will never see your card details.</strong> Everything is encrypted in your browser before it leaves this page.
        </p>
        <div className={`space-y-2 ${wt.body} text-neutral-600`}>
          <div className="flex items-start gap-2">
            <Lock className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <span>Your card details are encrypted using AES-256-GCM right here in your browser.</span>
          </div>
          <div className="flex items-start gap-2">
            <Download className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <span>The encrypted file is delivered to your bot or downloaded for you to place manually.</span>
          </div>
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <span>CreditClaw only stores the decryption key — never the card itself.</span>
          </div>
          <div className="flex items-start gap-2">
            <Bot className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <span>At checkout, a disposable sub-agent gets the key, decrypts, pays, and is deleted.</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        {onBack && (
          <Button variant="outline" onClick={onBack} className={`flex-1 ${wt.secondaryButton} gap-2`} data-testid="button-r5-step2-back">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        )}
        <Button onClick={onNext} className={`flex-1 ${wt.primaryButton} gap-2`} data-testid="button-r5-step2-next">
          Got It <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
