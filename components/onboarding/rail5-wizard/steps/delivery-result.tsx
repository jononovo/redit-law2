"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle2, Loader2, ArrowRight, Download, Sparkles, ChevronDown, Send, Copy, MessageCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { wt } from "@/lib/wizard-typography";
import { StepHeader } from "../step-header";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/features/platform-management/auth-fetch";
import { downloadEncryptedFile } from "@/features/payment-rails/card/onboarding-rail5/encrypt";
import { RAIL5_CARD_DELIVERED } from "@/features/platform-management/agent-management/bot-messaging/templates";
import { type Step7Props } from "../types";

export function DeliveryResult({
  cardId, cardName, cardLast4, spendingLimit, dailyLimit, monthlyLimit,
  selectedBotId, bots, directDeliverySucceeded, deliveryResult, storedFileContent, onNext, onDone,
}: Step7Props) {
  const { toast } = useToast();
  const [botConfirmed, setBotConfirmed] = useState(false);
  const [pollingDone, setPollingDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [discordCopied, setDiscordCopied] = useState(false);
  const [showAgentSection, setShowAgentSection] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  const isWaiting = selectedBotId && !directDeliverySucceeded && !botConfirmed;

  const relayMessage = RAIL5_CARD_DELIVERED;

  const deliveryConfirmed = directDeliverySucceeded || botConfirmed;

  useEffect(() => {
    if (!selectedBotId || !cardId || directDeliverySucceeded) return;

    startTimeRef.current = Date.now();

    const poll = async () => {
      try {
        const res = await authFetch(`/api/v1/rail5/cards/${cardId}/delivery-status`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "confirmed" || data.status === "active") {
            setBotConfirmed(true);
            if (pollingRef.current) clearInterval(pollingRef.current);
          }
        }
      } catch {}

      if (!pollingDone && Date.now() - startTimeRef.current >= 60_000) {
        setPollingDone(true);
      }
    };

    pollingRef.current = setInterval(poll, 5000);
    poll();

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [selectedBotId, cardId, directDeliverySucceeded]);

  function handleCopy() {
    navigator.clipboard.writeText(relayMessage).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleTelegram() {
    const url = `https://t.me/share/url?text=${encodeURIComponent(relayMessage)}`;
    window.open(url, "_blank");
  }

  function handleDiscord() {
    navigator.clipboard.writeText(relayMessage).then(() => {
      setDiscordCopied(true);
      toast({ title: "Copied!", description: "Paste this in Discord to send to your bot." });
      setTimeout(() => setDiscordCopied(false), 2000);
    });
  }

  function handleRedownload() {
    if (!storedFileContent) return;
    const baseName = `Card-${cardName.replace(/[^a-zA-Z0-9-]/g, "")}-${cardLast4}`;
    downloadEncryptedFile(storedFileContent, `${baseName}.md`);
  }

  const botDisplayName = bots.find(b => b.bot_id === selectedBotId)?.bot_name || selectedBotId;

  return (
    <div className="space-y-6" data-testid="r5-step-success">
      {directDeliverySucceeded ? (
        <StepHeader icon={CheckCircle2} iconBg="bg-green-50" iconColor="text-green-600" iconSize="lg" title="Bot Received the Card" tooltip={`Your encrypted card file was delivered to ${botDisplayName} via webhook.`} titleTestId="text-delivery-title" />
      ) : botConfirmed ? (
        <StepHeader icon={CheckCircle2} iconBg="bg-green-50" iconColor="text-green-600" iconSize="lg" title="Bot Confirmed!" tooltip={`${botDisplayName} picked up and confirmed the card file.`} titleTestId="text-delivery-title" />
      ) : isWaiting ? (
        <StepHeader icon={pollingDone ? Send : Loader2} iconBg="bg-amber-50" iconColor={`text-amber-600${pollingDone ? "" : " animate-spin"}`} iconSize="lg" title={pollingDone ? "File Staged for Your Bot" : "Waiting for Your Bot..."} tooltip={pollingDone ? "Your encrypted card file is staged for 24 hours. Your bot can pick it up anytime." : "Your encrypted card file is ready for pickup. Tell your bot to check for messages."} titleTestId="text-delivery-title" />
      ) : (
        <StepHeader icon={Sparkles} iconBg="bg-green-50" iconColor="text-green-600" iconSize="lg" title="Card Ready!" tooltip="Your encrypted card has been set up successfully." titleTestId="text-delivery-title" />
      )}

      {isWaiting && (
        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs text-amber-700 font-medium mb-2">Send this to your bot:</p>
            <pre className="text-xs text-amber-900 whitespace-pre-wrap font-mono bg-amber-100/50 rounded-lg p-3" data-testid="text-relay-message">
              {relayMessage}
            </pre>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5 text-xs h-9"
              onClick={handleCopy}
              data-testid="button-share-copy"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5 text-xs h-9"
              onClick={handleTelegram}
              data-testid="button-share-telegram"
            >
              <Send className="w-3.5 h-3.5" />
              Telegram
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5 text-xs h-9"
              onClick={handleDiscord}
              data-testid="button-share-discord"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              {discordCopied ? "Copied!" : "Discord"}
            </Button>
          </div>
        </div>
      )}

      {deliveryConfirmed ? (
        <Button onClick={onNext} className={`w-full ${wt.primaryButton} gap-2 bg-green-600 hover:bg-green-700`} data-testid="button-r5-next-test">
          <ArrowRight className="w-4 h-4" /> Continue to Test Verification
        </Button>
      ) : null}

      <div className="bg-neutral-50 rounded-xl p-5 space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-neutral-500">Card</span>
          <span className="font-medium text-neutral-900">{cardName} (••••{cardLast4})</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">Per-Checkout Limit</span>
          <span className="font-medium text-neutral-900">${spendingLimit}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">Daily / Monthly</span>
          <span className="font-medium text-neutral-900">${dailyLimit} / ${monthlyLimit}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">Bot</span>
          <span className="font-medium text-neutral-900">
            {selectedBotId
              ? `${botDisplayName}${directDeliverySucceeded || botConfirmed ? " — Card delivered" : ""}`
              : "Not linked yet"}
          </span>
        </div>
      </div>

      <div>
        <button
          className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors flex items-center gap-1"
          onClick={() => setShowAgentSection(!showAgentSection)}
          data-testid="button-r5-agent-section-toggle"
        >
          <ChevronDown className={`w-3 h-3 transition-transform ${showAgentSection ? "rotate-180" : ""}`} />
          For AI Agents or manual file placement
        </button>
        {showAgentSection && (
          <div className="mt-3 space-y-3 bg-neutral-50 rounded-xl p-4 text-sm">
            <div>
              <p className="font-medium text-neutral-700 text-xs mb-1">For OpenClaw Bots</p>
              <p className="text-xs text-neutral-500">
                Place the downloaded file in your bot's <code className="bg-neutral-200 px-1 py-0.5 rounded text-[10px]">.creditclaw/cards/</code> folder.
                The file is self-contained — your bot can read the instructions at the top.
              </p>
            </div>
            <div>
              <p className="font-medium text-neutral-700 text-xs mb-1">For Applications with API</p>
              <p className="text-xs text-neutral-500">
                See the full Rail 5 integration guide:{" "}
                <a href="https://creditclaw.com/SKILL.md#rail-5" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                  creditclaw.com/skill.md <ExternalLink className="w-2.5 h-2.5" />
                </a>.
                Use <code className="bg-neutral-200 px-1 py-0.5 rounded text-[10px]">GET /bot/messages</code> to fetch card files programmatically.
              </p>
            </div>
            {storedFileContent && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={handleRedownload}
                data-testid="button-r5-redownload"
              >
                <Download className="w-3.5 h-3.5" />
                Re-download file
              </Button>
            )}
          </div>
        )}
      </div>

      {!deliveryConfirmed && (
        <button
          onClick={onDone}
          className="w-full text-center text-xs text-neutral-400 hover:text-neutral-600 transition-colors py-2"
          data-testid="button-r5-skip-test"
        >
          Skip — I'll check later
        </button>
      )}
    </div>
  );
}
