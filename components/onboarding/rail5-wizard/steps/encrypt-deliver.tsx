"use client";

import { Loader2, ArrowLeft, Lock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { wt } from "@/lib/wizard-typography";
import { StepHeader } from "../step-header";

interface EncryptDeliverProps {
  selectedBotId: string;
  encryptionDone: boolean;
  keySent: boolean;
  downloadDone: boolean;
  directDeliverySucceeded: boolean;
  deliveryAttempted: boolean;
  loading: boolean;
  preselectedBotId?: string;
  onBack: () => void;
  onEncrypt: () => void;
}

export function EncryptDeliver({
  selectedBotId, encryptionDone, keySent, downloadDone,
  directDeliverySucceeded, deliveryAttempted,
  loading, preselectedBotId,
  onBack, onEncrypt,
}: EncryptDeliverProps) {
  return (
    <div className="space-y-6" data-testid="r5-step-encrypt">
      <StepHeader
        icon={Lock}
        iconBg="bg-purple-50"
        iconColor="text-purple-600"
        title={selectedBotId ? "Encrypt & Deliver" : "🔐 Send to Agent"}
        tooltip={selectedBotId
          ? "Your card will be encrypted and delivered directly to your bot."
          : "Your card will be encrypted and downloaded as a file."}
      />

      <div className="bg-neutral-50 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${encryptionDone ? "bg-green-500" : "bg-neutral-200"}`}>
            {encryptionDone ? <CheckCircle2 className="w-4 h-4 text-white" /> : <span className="text-xs text-neutral-500">1</span>}
          </div>
          <span className={`${wt.body} text-neutral-700`}>Encrypt card details (AES-256-GCM)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${keySent ? "bg-green-500" : "bg-neutral-200"}`}>
            {keySent ? <CheckCircle2 className="w-4 h-4 text-white" /> : <span className="text-xs text-neutral-500">2</span>}
          </div>
          <span className={`${wt.body} text-neutral-700`}>Secure decryption key at CreditClaw</span>
        </div>
        {selectedBotId && (
          <div className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${directDeliverySucceeded ? "bg-green-500" : deliveryAttempted && !directDeliverySucceeded ? "bg-amber-500" : "bg-neutral-200"}`}>
              {directDeliverySucceeded ? <CheckCircle2 className="w-4 h-4 text-white" /> : deliveryAttempted ? <CheckCircle2 className="w-4 h-4 text-white" /> : <span className="text-xs text-neutral-500">3</span>}
            </div>
            <span className={`${wt.body} text-neutral-700`}>
              {directDeliverySucceeded
                ? "Delivered to bot via webhook"
                : deliveryAttempted
                  ? "File staged for bot pickup"
                  : "Send encrypted file to bot"}
            </span>
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${downloadDone ? "bg-green-500" : "bg-neutral-200"}`}>
            {downloadDone ? <CheckCircle2 className="w-4 h-4 text-white" /> : <span className="text-xs text-neutral-500">{selectedBotId ? "4" : "3"}</span>}
          </div>
          <span className={`${wt.body} text-neutral-700`}>{selectedBotId ? "Download backup copy" : "Download encrypted card file"}</span>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={loading} className={`flex-1 ${wt.secondaryButton} gap-2`} data-testid="button-r5-step7-back">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Button onClick={onEncrypt} disabled={loading || downloadDone} className={`flex-1 ${wt.primaryButton} gap-2 bg-purple-600 hover:bg-purple-700`} data-testid="button-r5-encrypt">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          {downloadDone ? "Done!" : "Encrypt Now"}
        </Button>
      </div>
    </div>
  );
}
