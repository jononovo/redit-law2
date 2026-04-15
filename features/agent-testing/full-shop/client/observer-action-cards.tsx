"use client";

import { useState } from "react";

interface AwaitingAgentCardProps {
  instructionText: string | null;
  testUrl: string;
}

export function AwaitingAgentCard({ instructionText, testUrl }: AwaitingAgentCardProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const text = instructionText || testUrl;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div
      data-testid="card-awaiting-agent"
      className="w-full max-w-lg mx-4 rounded-2xl overflow-hidden"
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow: "0 8px 40px hsla(220, 15%, 15%, 0.2), 0 2px 12px hsla(220, 10%, 30%, 0.1)",
        border: "1px solid hsla(222, 10%, 85%, 0.5)",
      }}
    >
      <div
        className="px-6 py-4"
        style={{
          backgroundColor: "hsl(220, 15%, 15%)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 flex items-center justify-center">
            <span
              className="absolute inset-0 rounded-full animate-ping opacity-30"
              style={{ backgroundColor: "white" }}
            />
            <span
              className="relative block w-4 h-4 rounded-full"
              style={{ backgroundColor: "white" }}
            />
          </div>
          <h2
            className="text-white text-lg font-bold"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Waiting for your agent…
          </h2>
        </div>
      </div>

      <div className="px-6 py-5 space-y-4">
        <p className="text-sm" style={{ color: "hsl(222, 15%, 40%)" }}>
          Have you sent the instructions to your agent? Copy the message below and paste it into your agent's chat.
        </p>

        {instructionText && (
          <div
            className="rounded-xl p-4 relative group"
            style={{
              backgroundColor: "hsl(222, 47%, 97%)",
              border: "1px solid hsl(222, 10%, 88%)",
            }}
          >
            <pre
              data-testid="text-instruction-preview"
              className="text-xs leading-relaxed whitespace-pre-wrap break-words"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: "hsl(222, 47%, 25%)",
                maxHeight: "200px",
                overflowY: "auto",
              }}
            >
              {instructionText}
            </pre>
          </div>
        )}

        <button
          data-testid="button-copy-instructions"
          onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            backgroundColor: copied ? "hsl(142, 71%, 45%)" : "hsl(220, 10%, 30%)",
            color: "white",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          {copied ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copy Instructions
            </>
          )}
        </button>

        <div
          className="flex items-start gap-2 rounded-lg px-3 py-2.5"
          style={{
            backgroundColor: "hsla(10, 85%, 55%, 0.06)",
            border: "1px solid hsla(10, 85%, 55%, 0.15)",
          }}
        >
          <svg
            className="w-4 h-4 flex-shrink-0 mt-0.5"
            style={{ color: "hsl(10, 85%, 55%)" }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs" style={{ color: "hsl(10, 60%, 35%)" }}>
            Your agent needs browser-use capabilities to navigate this URL. Make sure it has the right tools and permissions.
          </p>
        </div>
      </div>
    </div>
  );
}

interface ApprovalRequiredCardProps {
  dashboardUrl?: string;
}

export function ApprovalRequiredCard({ dashboardUrl = "/overview" }: ApprovalRequiredCardProps) {
  return (
    <div
      data-testid="card-approval-required"
      className="w-full max-w-lg mx-4 rounded-2xl overflow-hidden"
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow: "0 8px 40px hsla(220, 15%, 15%, 0.2), 0 2px 12px hsla(220, 10%, 30%, 0.1)",
        border: "1px solid hsla(222, 10%, 85%, 0.5)",
      }}
    >
      <div
        className="px-6 py-4"
        style={{
          backgroundColor: "hsl(220, 15%, 15%)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "rgba(255, 255, 255, 0.2)" }}
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <h2
            className="text-white text-lg font-bold"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Approval Needed
          </h2>
        </div>
      </div>

      <div className="px-6 py-5 space-y-4">
        <p className="text-sm" style={{ color: "hsl(222, 15%, 40%)" }}>
          Your agent triggered a guardrail that requires your approval. Check your email or open your dashboard to approve or deny the request.
        </p>

        <a
          href={dashboardUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="link-open-dashboard"
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
          style={{
            backgroundColor: "hsl(220, 10%, 30%)",
            color: "white",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Open Dashboard in New Tab
        </a>

        <div
          className="flex items-start gap-2 rounded-lg px-3 py-2.5"
          style={{
            backgroundColor: "hsla(35, 95%, 55%, 0.06)",
            border: "1px solid hsla(35, 95%, 55%, 0.15)",
          }}
        >
          <svg
            className="w-4 h-4 flex-shrink-0 mt-0.5"
            style={{ color: "hsl(35, 80%, 40%)" }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs" style={{ color: "hsl(35, 60%, 30%)" }}>
            The agent is paused and waiting for your decision. The test timer continues to run.
          </p>
        </div>
      </div>
    </div>
  );
}
