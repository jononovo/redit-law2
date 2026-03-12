"use client";

import { useState, useCallback } from "react";
import { Copy, Check, ArrowLeft, ChevronDown, ChevronUp, Terminal } from "lucide-react";
import type { PaymentHandlerProps } from "../types";

function CopyButton({ text, label, size = "sm" }: { text: string; label?: string; size?: "sm" | "lg" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  if (size === "lg") {
    return (
      <button
        onClick={handleCopy}
        className={`
          w-full flex items-center justify-center gap-2 h-11 rounded-xl font-bold text-sm transition-all cursor-pointer
          ${copied
            ? "bg-green-50 text-green-600 border-2 border-green-200"
            : "bg-neutral-900 text-white hover:bg-neutral-800 border-2 border-neutral-900"
          }
        `}
        data-testid={`button-copy-${label || "text"}`}
      >
        {copied ? (
          <>
            <Check className="w-4 h-4" />
            Copied to clipboard
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            Copy instructions for your agent
          </>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-[#E8735A] transition-colors cursor-pointer"
      data-testid={`button-copy-${label || "text"}`}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-green-500" />
          <span className="text-green-500">Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

export function X402Handler({ context, onCancel }: PaymentHandlerProps) {
  const [showDetails, setShowDetails] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const checkoutId = context.checkoutPageId || "";

  const requirementsUrl = `${origin}/api/v1/checkout/${checkoutId}/x402`;
  const payUrl = `${origin}/api/v1/checkout/${checkoutId}/pay/x402`;

  const amountDisplay = context.amountUsd
    ? `$${context.amountUsd.toFixed(2)}`
    : "Open amount";

  const amountUsdc = context.amountUsd
    ? Math.round(context.amountUsd * 1_000_000)
    : null;

  const amountDetail = amountUsdc
    ? `${amountUsdc} (${context.amountUsd!.toFixed(2)} USDC, 6 decimals)`
    : "Open amount";

  const agentInstructions = `Pay ${amountDisplay} for this product via x402 on Base.

Requirements: GET ${requirementsUrl}
Pay: POST ${payUrl}
Recipient: ${context.walletAddress}
Amount: ${amountDetail}
Token: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (USDC on Base)
Chain: 8453 (Base)
Protocol: EIP-3009 transferWithAuthorization

Sign the payload and send it as a base64-encoded X-PAYMENT header to the Pay endpoint.`;

  const snippet = `const payload = {
  from: "YOUR_WALLET_ADDRESS",
  to: "${context.walletAddress}",${amountUsdc ? `\n  value: "${amountUsdc}",` : '\n  value: "AMOUNT_IN_USDC_ATOMIC", // 1 USDC = 1000000'}
  validAfter: 0,
  validBefore: Math.floor(Date.now() / 1000) + 3600,
  nonce: "0x" + crypto.randomUUID().replace(/-/g, "").padEnd(64, "0"),
  chainId: 8453,
  token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  signature: "SIGNED_VIA_EIP3009"
};

const header = btoa(JSON.stringify(payload));

const res = await fetch("${payUrl}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-PAYMENT": header
  },
  body: JSON.stringify({})
});

const result = await res.json();
console.log(result);`;

  const curlSnippet = `curl -X POST "${payUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-PAYMENT: <base64-encoded-payload>" \\
  -d '{}'`;

  return (
    <div className="w-full" data-testid="x402-handler">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onCancel}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
          data-testid="button-x402-back"
        >
          <ArrowLeft className="w-4 h-4 text-neutral-600" />
        </button>
        <div>
          <h3 className="text-lg font-bold text-neutral-900">Agent Pay (x402)</h3>
          <p className="text-xs text-neutral-500">Copy and send to your AI agent</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4">
          <pre
            className="text-sm font-mono text-neutral-700 whitespace-pre-wrap leading-relaxed break-all"
            data-testid="text-x402-agent-instructions"
          >
            {agentInstructions}
          </pre>
          <p className="text-xs text-neutral-400 mt-2">
            Any x402-compatible agent can use these instructions
          </p>
        </div>

        <CopyButton text={agentInstructions} label="agent-instructions" size="lg" />

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-center gap-2 text-xs font-medium text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer py-2"
          data-testid="button-toggle-details"
        >
          {showDetails ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Hide developer details
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              Show developer details
            </>
          )}
        </button>

        {showDetails && (
          <div className="space-y-4">
            <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
                  <Terminal className="w-4 h-4" />
                  Code Example
                </div>
                <CopyButton text={snippet} label="snippet" />
              </div>
              <pre
                className="text-xs font-mono text-neutral-600 bg-white rounded-lg px-3 py-3 border border-neutral-200 overflow-x-auto whitespace-pre leading-relaxed"
                data-testid="text-x402-snippet"
              >
                {snippet}
              </pre>
            </div>

            <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
                  <Terminal className="w-4 h-4" />
                  cURL
                </div>
                <CopyButton text={curlSnippet} label="curl" />
              </div>
              <pre
                className="text-xs font-mono text-neutral-600 bg-white rounded-lg px-3 py-3 border border-neutral-200 overflow-x-auto whitespace-pre leading-relaxed"
                data-testid="text-x402-curl"
              >
                {curlSnippet}
              </pre>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-neutral-400">
          Any x402-compatible agent can use these instructions
        </p>
      </div>
    </div>
  );
}
