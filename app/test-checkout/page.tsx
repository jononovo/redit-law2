"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { CheckoutPaymentPanel } from "@/features/agent-shops/payments/components/checkout-payment-panel";
import type { PaymentResult } from "@/features/agent-shops/payments/types";
import { AGENT_TEST_ID_PREFIX } from "@/features/agent-testing/constants";

interface CheckoutData {
  checkout_page_id: string;
  title: string;
  description: string | null;
  amount_usdc: number | null;
  amount_locked: boolean;
  allowed_methods: string[];
  wallet_address: string;
  seller_name: string | null;
  collect_buyer_name: boolean;
  page_type: "product" | "event" | "digital_product";
}

interface AgentTestData {
  test_id: string;
  card_test_token: string | null;
  checkout_page_id: string;
}

type PageState = "loading" | "ready" | "not_found" | "error";

export default function TestCheckoutPage() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("t");

  const isAgentTest = tokenParam?.startsWith(AGENT_TEST_ID_PREFIX) ?? false;
  const agentTestId = isAgentTest ? tokenParam : null;

  const [pageState, setPageState] = useState<PageState>("loading");
  const [checkout, setCheckout] = useState<CheckoutData | null>(null);
  const [testData, setTestData] = useState<AgentTestData | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!tokenParam) {
      setPageState("not_found");
      return;
    }

    async function load() {
      try {
        if (isAgentTest && agentTestId) {
          const testRes = await fetch(`/api/v1/agent-testing/tests/${agentTestId}`);
          if (!testRes.ok) {
            setPageState("not_found");
            return;
          }
          const testStatus = await testRes.json();

          if (testStatus.status === "scored") {
            setPageState("not_found");
            return;
          }

          const testDetailRes = await fetch(`/api/v1/agent-testing/tests/${agentTestId}/detail`);
          let cardTestToken: string | null = null;
          let checkoutPageId: string | null = null;

          if (testDetailRes.ok) {
            const detail = await testDetailRes.json();
            cardTestToken = detail.card_test_token;
            checkoutPageId = detail.checkout_page_id;
          }

          if (!checkoutPageId) {
            const { RAIL5_TEST_CHECKOUT_PAGE_ID } = await import("@/features/payment-rails/rail5");
            checkoutPageId = RAIL5_TEST_CHECKOUT_PAGE_ID;
          }

          setTestData({
            test_id: agentTestId,
            card_test_token: cardTestToken,
            checkout_page_id: checkoutPageId,
          });

          const legacyToken = cardTestToken || agentTestId;
          const checkoutRes = await fetch(
            `/api/v1/checkout/${checkoutPageId}/public?t=${encodeURIComponent(legacyToken)}`,
          );

          if (!checkoutRes.ok) {
            setPageState("not_found");
            return;
          }

          const checkoutData = await checkoutRes.json();
          setCheckout(checkoutData);
          setPageState("ready");
        } else {
          setPageState("not_found");
        }
      } catch {
        setPageState("error");
      }
    }

    load();
  }, [tokenParam, isAgentTest, agentTestId]);

  const handlePaymentSuccess = (_result: PaymentResult) => {
    setCompleted(true);
  };

  if (pageState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50" data-testid="test-checkout-loading">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
          <p className="text-sm text-neutral-500">Loading test checkout...</p>
        </div>
      </div>
    );
  }

  if (pageState === "not_found") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50" data-testid="test-checkout-not-found">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-neutral-400" />
          <p className="text-base font-medium text-neutral-700">Test not found</p>
          <p className="text-sm text-neutral-500">This test link is invalid or has already been completed.</p>
        </div>
      </div>
    );
  }

  if (pageState === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50" data-testid="test-checkout-error">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-base font-medium text-neutral-700">Something went wrong</p>
          <p className="text-sm text-neutral-500">Please try again later.</p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50" data-testid="test-checkout-complete">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-base font-medium text-neutral-700">Test payment submitted</p>
          <p className="text-sm text-neutral-500">Your results are being scored.</p>
        </div>
      </div>
    );
  }

  if (!checkout) return null;

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6" data-testid="test-checkout-page">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-neutral-900" data-testid="test-checkout-title">{checkout.title}</h1>
          {checkout.description && (
            <p className="text-sm text-neutral-500 mt-1">{checkout.description}</p>
          )}
        </div>

        <CheckoutPaymentPanel
          checkoutPageId={testData?.checkout_page_id ?? checkout.checkout_page_id}
          walletAddress={checkout.wallet_address}
          effectiveAmount={checkout.amount_usdc}
          displayAmount={checkout.amount_usdc ? `$${checkout.amount_usdc.toFixed(2)}` : null}
          collectBuyerName={checkout.collect_buyer_name}
          allowedMethods={checkout.allowed_methods}
          pageType={checkout.page_type}
          buyerCount={null}
          testToken={testData?.card_test_token || undefined}
          agentTestId={agentTestId || undefined}
          onSuccess={handlePaymentSuccess}
        />
      </div>
    </div>
  );
}
