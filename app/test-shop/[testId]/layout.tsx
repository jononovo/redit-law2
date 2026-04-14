"use client";

import { Suspense, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { ShopTestContextProvider, useShopTest } from "@/features/agent-testing/full-shop/client/shop-test-context";
import { ObserverStageOverlay } from "@/features/agent-testing/full-shop/client/observer-stage-overlay";
import { ActionOverlay } from "@/components/ui/action-overlay";
import { AwaitingAgentCard, ApprovalRequiredCard } from "@/features/agent-testing/full-shop/client/observer-action-cards";
import { useObserverOverlay } from "@/features/agent-testing/full-shop/client/use-observer-overlay";

function ObserverBanner() {
  const { isObserver, testStatus } = useShopTest();
  if (!isObserver) return null;

  return (
    <div
      data-testid="observer-banner"
      className="text-white text-center text-sm py-2 px-4 font-semibold tracking-wide"
      style={{
        background: "linear-gradient(135deg, hsl(10, 85%, 55%), hsl(260, 90%, 65%))",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      Observer Mode — You are watching the agent in real time
      {testStatus === "scored" && " — Test Complete"}
    </div>
  );
}

function ShopSearchBar() {
  const { testId, isObserver, shopState } = useShopTest();
  const router = useRouter();
  const observeParam = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("observe")
    : null;
  const qs = observeParam ? `?observe=${observeParam}` : "";

  const [query, setQuery] = useState("");

  const displayQuery = isObserver ? (shopState.searchQuery || "") : query;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || isObserver) return;
    router.push(`/test-shop/${testId}/search?q=${encodeURIComponent(query.trim())}${qs ? "&" + qs.slice(1) : ""}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 flex-1 max-w-xl">
      <input
        type="text"
        data-testid="input-header-search"
        value={isObserver ? displayQuery : query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products..."
        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        readOnly={isObserver}
      />
      <button
        type="submit"
        data-testid="button-header-search"
        disabled={isObserver}
        className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
      >
        Search
      </button>
    </form>
  );
}

function ShopHeader() {
  const { testId, isObserver } = useShopTest();
  const observeParam = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("observe")
    : null;
  const qs = observeParam ? `?observe=${observeParam}` : "";

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
        <a
          href={`/test-shop/${testId}${qs}`}
          data-testid="link-shop-home"
          className="text-lg font-bold text-gray-900 tracking-tight flex-shrink-0"
        >
          TestTopia
        </a>
        <ShopSearchBar />
        <a
          href={`/test-shop/${testId}/cart${qs}`}
          data-testid="link-cart"
          className="relative text-gray-700 hover:text-gray-900 transition-colors flex-shrink-0"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
        </a>
      </div>
    </header>
  );
}

function LoadingShell() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-pulse text-gray-400 text-lg">Loading store...</div>
    </div>
  );
}

function TimeoutScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center" data-testid="timeout-screen">
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2" data-testid="text-timeout-heading">
          Session Timed Out
        </h1>
        <p className="text-gray-500 mb-8" data-testid="text-timeout-message">
          This test session has expired due to inactivity. No data has been saved.
        </p>
        <a
          href="/agent-shopping-test"
          data-testid="link-return-home"
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          Return to Testing Home
        </a>
      </div>
    </div>
  );
}

function ObserverActionOverlay() {
  const { instructionText, testId } = useShopTest();
  const overlayCard = useObserverOverlay();

  if (!overlayCard) return null;

  const testUrl = typeof window !== "undefined"
    ? `${window.location.origin}/test-shop/${testId}`
    : `/test-shop/${testId}`;

  return (
    <ActionOverlay open>
      {overlayCard === "awaiting_agent" ? (
        <AwaitingAgentCard instructionText={instructionText} testUrl={testUrl} />
      ) : (
        <ApprovalRequiredCard />
      )}
    </ActionOverlay>
  );
}

function ShopShell({ children }: { children: ReactNode }) {
  const { isLoading, testStatus } = useShopTest();

  if (isLoading) return <LoadingShell />;
  if (testStatus === "timed_out") return <TimeoutScreen />;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ObserverBanner />
      <ShopHeader />
      <ObserverStageOverlay />
      <ObserverActionOverlay />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  );
}

export default function TestShopLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const testId = params.testId as string;

  return (
    <Suspense fallback={<LoadingShell />}>
      <ShopTestContextProvider testId={testId}>
        <ShopShell>{children}</ShopShell>
      </ShopTestContextProvider>
    </Suspense>
  );
}
