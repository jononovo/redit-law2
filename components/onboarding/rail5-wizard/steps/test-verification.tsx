"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle2, Loader2, Shield, X, Copy, Send, MessageCircle, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { wt } from "@/lib/wizard-typography";
import { StepHeader } from "../step-header";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/features/platform-management/auth-fetch";
import { type Step8Props, type TestPurchaseResult, type TestPurchaseApiResponse, FIELD_LABELS } from "../types";

const TEST_RELAY_MESSAGE = `Complete a test purchase to verify your encrypted card file works correctly.

Steps:
1. Check your messages: GET https://creditclaw.com/api/v1/bot/messages — look for a "rail5.test.required" event with a test_checkout_url.
2. Navigate to the test_checkout_url from that message.
3. Decrypt the encrypted card file you saved in .creditclaw/cards/
4. Fill in ALL fields on the checkout form: card number, expiry, CVV, cardholder name, billing address, city, state, ZIP.
5. Submit the test payment.

This is a sandbox checkout — no real payment will be processed.`;

export function TestVerification({ cardId, cardName, cardLast4, savedCardDetails, onDone }: Step8Props) {
  const { toast } = useToast();
  const [optedIn, setOptedIn] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [testPurchaseResult, setTestPurchaseResult] = useState<TestPurchaseResult | null>(null);
  const [testPollingActive, setTestPollingActive] = useState(false);
  const [testPollingTimedOut, setTestPollingTimedOut] = useState(false);
  const [testStatus, setTestStatus] = useState<"pending" | "in_progress" | "completed">("pending");
  const [copied, setCopied] = useState(false);
  const [discordCopied, setDiscordCopied] = useState(false);
  const testPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const testStartRef = useRef(Date.now());

  const normalize = (v: string | undefined | null) => (v || "").trim().toLowerCase();

  const compareFields = (submitted: TestPurchaseApiResponse["submitted_details"]): TestPurchaseResult => {
    if (!submitted || !savedCardDetails) return { status: "completed", verified: false, fields: {} };
    const fields: Record<string, { match: boolean }> = {
      card_number: { match: normalize(submitted.cardNumber) === normalize(savedCardDetails.cardNumber) },
      card_expiry: { match: normalize(submitted.cardExpiry) === normalize(savedCardDetails.cardExpiry) },
      card_cvv: { match: normalize(submitted.cardCvv) === normalize(savedCardDetails.cardCvv) },
      cardholder_name: { match: normalize(submitted.cardholderName) === normalize(savedCardDetails.cardholderName) },
      billing_address: { match: normalize(submitted.billingAddress) === normalize(savedCardDetails.billingAddress) },
      billing_city: { match: normalize(submitted.billingCity) === normalize(savedCardDetails.billingCity) },
      billing_state: { match: normalize(submitted.billingState) === normalize(savedCardDetails.billingState) },
      billing_zip: { match: normalize(submitted.billingZip) === normalize(savedCardDetails.billingZip) },
    };
    return {
      status: "completed",
      verified: Object.values(fields).every((f) => f.match),
      fields,
    };
  };

  useEffect(() => {
    if (!cardId) {
      setInitialCheckDone(true);
      return;
    }

    (async () => {
      try {
        const res = await authFetch(`/api/v1/rail5/cards/${cardId}/test-purchase-status`);
        if (res.ok) {
          const data: TestPurchaseApiResponse = await res.json();
          if (data.status === "completed" && data.submitted_details) {
            const result = compareFields(data.submitted_details);
            result.sale_id = data.sale_id;
            setTestPurchaseResult(result);
            setTestStatus("completed");
            setOptedIn(true);
          } else if (data.status === "in_progress") {
            setTestStatus("in_progress");
            setOptedIn(true);
          }
        }
      } catch {}
      setInitialCheckDone(true);
    })();
  }, [cardId]);

  useEffect(() => {
    if (!optedIn || !cardId) return;
    if (testPurchaseResult?.status === "completed") return;

    setTestPollingActive(true);
    testStartRef.current = Date.now();

    const pollTest = async () => {
      try {
        const res = await authFetch(`/api/v1/rail5/cards/${cardId}/test-purchase-status`);
        if (res.ok) {
          const data: TestPurchaseApiResponse = await res.json();
          if (data.status === "completed" && data.submitted_details) {
            const result = compareFields(data.submitted_details);
            result.sale_id = data.sale_id;
            setTestPurchaseResult(result);
            setTestStatus("completed");
            setTestPollingActive(false);
            if (testPollingRef.current) clearInterval(testPollingRef.current);
          } else if (data.status === "in_progress") {
            setTestStatus("in_progress");
          }
        }
      } catch {}

      if (Date.now() - testStartRef.current >= 300_000) {
        setTestPollingTimedOut(true);
        setTestPollingActive(false);
        if (testPollingRef.current) clearInterval(testPollingRef.current);
      }
    };

    testPollingRef.current = setInterval(pollTest, 5000);
    pollTest();

    return () => {
      if (testPollingRef.current) clearInterval(testPollingRef.current);
    };
  }, [optedIn, cardId, testPurchaseResult?.status]);

  function handleCopy() {
    navigator.clipboard.writeText(TEST_RELAY_MESSAGE).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleTelegram() {
    const url = `https://t.me/share/url?text=${encodeURIComponent(TEST_RELAY_MESSAGE)}`;
    window.open(url, "_blank");
  }

  function handleDiscord() {
    navigator.clipboard.writeText(TEST_RELAY_MESSAGE).then(() => {
      setDiscordCopied(true);
      toast({ title: "Copied!", description: "Paste this in Discord to send to your bot." });
      setTimeout(() => setDiscordCopied(false), 2000);
    });
  }

  if (!initialCheckDone) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="r5-step-test-verification">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!optedIn) {
    return (
      <div className="space-y-6" data-testid="r5-step-test-verification">
        <StepHeader icon={FlaskConical} iconBg="bg-blue-50" iconColor="text-blue-600" iconSize="lg" title="Test Your Agent" tooltip="Do you want your agent to do a test payment in our sandbox?" titleTestId="text-test-title" />
        <p className="text-xs text-neutral-400 text-center">
          This runs a simulated checkout to verify your agent can decrypt and use the card. No real charges.
        </p>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onDone}
            className={`flex-1 ${wt.secondaryButton}`}
            data-testid="button-r5-skip-test"
          >
            Skip
          </Button>
          <Button
            onClick={() => setOptedIn(true)}
            className={`flex-1 ${wt.primaryButton} gap-2`}
            data-testid="button-r5-start-test"
          >
            <FlaskConical className="w-4 h-4" /> Yes, run test
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="r5-step-test-verification">
      <StepHeader icon={Shield} iconBg="bg-blue-50" iconColor="text-blue-600" iconSize="lg" title="Test Verification" tooltip="Your bot is completing a sandbox test purchase to verify the card file decrypts correctly." titleTestId="text-test-title" />

      <div className="space-y-3" data-testid="r5-test-verification">
        {testPurchaseResult?.status === "completed" ? (
          <div className={`rounded-xl p-4 border ${testPurchaseResult.verified ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            <div className="flex items-center gap-2 mb-3">
              {testPurchaseResult.verified ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <Shield className="w-5 h-5 text-red-600" />
              )}
              <span className={`font-semibold text-sm ${testPurchaseResult.verified ? "text-green-800" : "text-red-800"}`} data-testid="text-verification-result">
                {testPurchaseResult.verified
                  ? "Card Verified — encryption and decryption working correctly"
                  : "Verification Failed — some fields did not match"}
              </span>
            </div>
            {testPurchaseResult.fields && (
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(testPurchaseResult.fields).map(([field, result]) => (
                  <div key={field} className="flex items-center gap-1.5 text-xs" data-testid={`verification-field-${field}`}>
                    {result.match ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                    )}
                    <span className={result.match ? "text-green-700" : "text-red-700"}>
                      {FIELD_LABELS[field] || field}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : testStatus === "in_progress" ? (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <span className="font-medium text-sm text-blue-800" data-testid="text-verification-in-progress">
                Your bot is completing the test checkout...
              </span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Your bot has started the test — it's decrypting the card and filling in the checkout form. This usually takes about a minute.
            </p>
          </div>
        ) : testPollingTimedOut ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-600" />
              <span className="font-medium text-sm text-amber-800" data-testid="text-verification-timeout">
                Test purchase not completed yet
              </span>
            </div>
            <p className="text-xs text-amber-600 mt-1">
              Your bot hasn't completed the test checkout yet. It may still complete it later — you can check the card's status from your dashboard.
            </p>
          </div>
        ) : testStatus === "pending" && testPollingActive ? (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                <span className="font-medium text-sm text-blue-800" data-testid="text-verification-pending">
                  Waiting for your bot to start the test checkout...
                </span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Your bot was sent test instructions automatically. If it doesn't start within a minute, you can send the instructions manually below.
              </p>
            </div>

            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs text-amber-700 font-medium mb-2">Send this to your bot:</p>
                <pre className="text-xs text-amber-900 whitespace-pre-wrap font-mono bg-amber-100/50 rounded-lg p-3" data-testid="text-test-relay-message">
                  {TEST_RELAY_MESSAGE}
                </pre>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 text-xs h-9"
                  onClick={handleCopy}
                  data-testid="button-test-share-copy"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? "Copied!" : "Copy"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 text-xs h-9"
                  onClick={handleTelegram}
                  data-testid="button-test-share-telegram"
                >
                  <Send className="w-3.5 h-3.5" />
                  Telegram
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 text-xs h-9"
                  onClick={handleDiscord}
                  data-testid="button-test-share-discord"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {discordCopied ? "Copied!" : "Discord"}
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </div>

      <div className="bg-neutral-50 rounded-xl p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-neutral-500">Card</span>
          <span className="font-medium text-neutral-900">{cardName} (••••{cardLast4})</span>
        </div>
      </div>

      <Button onClick={onDone} className={`w-full ${wt.primaryButton} gap-2 bg-green-600 hover:bg-green-700`} data-testid="button-r5-done">
        <CheckCircle2 className="w-4 h-4" /> Go to Dashboard
      </Button>

      {testStatus !== "completed" && (
        <button
          onClick={onDone}
          className={`w-full text-center ${wt.body} text-neutral-400 hover:text-neutral-600 transition-colors py-1 cursor-pointer`}
          data-testid="button-r5-skip-test-during"
        >
          Skip — I'll check later
        </button>
      )}
    </div>
  );
}
