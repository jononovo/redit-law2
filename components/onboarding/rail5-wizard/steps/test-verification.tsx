"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle2, Loader2, Shield, Copy, Send, MessageCircle, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { wt } from "@/lib/wizard-typography";
import { StepHeader } from "../step-header";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/features/platform-management/auth-fetch";
import { AgentTestReportCard } from "@/features/agent-testing/components/agent-test-report-card";
import { AgentTestProgressIndicator } from "@/features/agent-testing/components/agent-test-progress-indicator";
import type { TestReport } from "@/features/agent-testing/types";
import type { Step8Props } from "../types";

const TEST_RELAY_MESSAGE = `Complete a test purchase to verify your encrypted card file works correctly.

Steps:
1. Check your messages: GET https://creditclaw.com/api/v1/bot/messages — look for a "rail5.test.required" event with a test_checkout_url.
2. Navigate to the test_checkout_url from that message.
3. Decrypt the encrypted card file you saved in .creditclaw/cards/
4. Fill in ALL fields on the checkout form: card number, expiry, CVV, cardholder name, billing address, city, state, ZIP.
5. Submit the test payment.

This is a sandbox checkout — no real payment will be processed.`;

interface AgentTestStatus {
  test_id: string;
  status: string;
  fields_filled: number;
  total_fields: number;
  page_loaded_at: string | null;
  first_interaction_at: string | null;
  submitted_at: string | null;
  score: number | null;
  grade: string | null;
}

export function TestVerification({ cardId, cardName, cardLast4, savedCardDetails, onDone }: Step8Props) {
  const { toast } = useToast();
  const [optedIn, setOptedIn] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [agentTestId, setAgentTestId] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<AgentTestStatus | null>(null);
  const [testReport, setTestReport] = useState<TestReport | null>(null);
  const [pollingTimedOut, setPollingTimedOut] = useState(false);
  const [copied, setCopied] = useState(false);
  const [discordCopied, setDiscordCopied] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const testStartRef = useRef(Date.now());

  useEffect(() => {
    if (!cardId) {
      setInitialCheckDone(true);
      return;
    }

    (async () => {
      try {
        const res = await authFetch(`/api/v1/agent-testing/tests/by-card/${cardId}`);
        if (res.ok) {
          const data = await res.json();
          const tests = data.tests ?? [];
          const latest = tests[tests.length - 1];
          if (latest?.test_id) {
            setAgentTestId(latest.test_id);
            setOptedIn(true);

            if (latest.status === "scored") {
              try {
                const reportRes = await fetch(`/api/v1/agent-testing/tests/${latest.test_id}/report`);
                if (reportRes.ok) {
                  const report: TestReport = await reportRes.json();
                  setTestReport(report);
                  setTestStatus({
                    test_id: latest.test_id,
                    status: "scored",
                    fields_filled: report.scores?.completion?.fields_filled ?? 0,
                    total_fields: report.scores?.completion?.total_fields ?? 6,
                    page_loaded_at: null,
                    first_interaction_at: null,
                    submitted_at: null,
                    score: latest.score ?? report.overall_score,
                    grade: latest.grade ?? report.grade,
                  });
                }
              } catch {}
            }
          }
        }
      } catch {}
      setInitialCheckDone(true);
    })();
  }, [cardId]);

  async function createAgentTest() {
    try {
      const res = await authFetch("/api/v1/agent-testing/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_id: cardId }),
      });
      if (res.ok) {
        const data = await res.json();
        setAgentTestId(data.test_id);
        return data.test_id;
      }
    } catch {
      toast({ title: "Error", description: "Failed to create test. Please try again.", variant: "destructive" });
    }
    return null;
  }

  useEffect(() => {
    if (!optedIn || !agentTestId) return;
    if (testReport) return;

    testStartRef.current = Date.now();

    const poll = async () => {
      try {
        const res = await fetch(`/api/v1/agent-testing/tests/${agentTestId}`);
        if (res.ok) {
          const data: AgentTestStatus = await res.json();
          setTestStatus(data);

          if (data.status === "scored") {
            if (pollingRef.current) clearInterval(pollingRef.current);

            try {
              const reportRes = await fetch(`/api/v1/agent-testing/tests/${agentTestId}/report`);
              if (reportRes.ok) {
                const report: TestReport = await reportRes.json();
                setTestReport(report);
              }
            } catch {}
          }
        }
      } catch {}

      if (Date.now() - testStartRef.current >= 300_000) {
        setPollingTimedOut(true);
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    };

    pollingRef.current = setInterval(poll, 5000);
    poll();

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [optedIn, agentTestId, testReport]);

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
      toast({ title: "Copied!", description: "Paste this in Discord to send to your agent." });
      setTimeout(() => setDiscordCopied(false), 2000);
    });
  }

  async function handleOptIn() {
    setOptedIn(true);
    if (!agentTestId) {
      await createAgentTest();
    }
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
            onClick={handleOptIn}
            className={`flex-1 ${wt.primaryButton} gap-2`}
            data-testid="button-r5-start-test"
          >
            <FlaskConical className="w-4 h-4" /> Yes, run test
          </Button>
        </div>
      </div>
    );
  }

  const currentStatus = testStatus?.status ?? "created";
  const isScored = currentStatus === "scored" && testReport;
  const isInProgress = currentStatus === "in_progress" || currentStatus === "page_loaded";
  const isPending = currentStatus === "created" || currentStatus === "approved";

  return (
    <div className="space-y-6" data-testid="r5-step-test-verification">
      <StepHeader icon={Shield} iconBg="bg-blue-50" iconColor="text-blue-600" iconSize="lg" title="Test Verification" tooltip="Your agent is completing a sandbox test purchase to verify the card file decrypts correctly." titleTestId="text-test-title" />

      <div className="space-y-3" data-testid="r5-test-verification">
        {isScored && testReport ? (
          <AgentTestReportCard report={testReport} />
        ) : isInProgress && testStatus ? (
          <div className="space-y-4">
            <AgentTestProgressIndicator
              fieldsFilled={testStatus.fields_filled}
              totalFields={testStatus.total_fields}
              status={testStatus.status as any}
            />
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                <span className="font-medium text-sm text-blue-800" data-testid="text-verification-in-progress">
                  Your agent is completing the test checkout...
                </span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Your agent has loaded the checkout page — it's decrypting the card and filling in the form. This usually takes about a minute.
              </p>
            </div>
          </div>
        ) : pollingTimedOut ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-600" />
              <span className="font-medium text-sm text-amber-800" data-testid="text-verification-timeout">
                Test purchase not completed yet
              </span>
            </div>
            <p className="text-xs text-amber-600 mt-1">
              Your agent hasn't completed the test checkout yet. It may still complete it later — you can check the card's status from your dashboard.
            </p>
          </div>
        ) : isPending ? (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                <span className="font-medium text-sm text-blue-800" data-testid="text-verification-pending">
                  Waiting for your agent to start the test checkout...
                </span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Your agent was sent test instructions automatically. If it doesn't start within a minute, you can send the instructions manually below.
              </p>
            </div>

            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs text-amber-700 font-medium mb-2">Send this to your agent:</p>
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

      {currentStatus !== "scored" && (
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
