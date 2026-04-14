"use client";

import { Suspense, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { ShopTestContextProvider, useShopTest } from "@/features/agent-testing/full-shop/client/shop-test-context";

function ObserverBanner() {
  const { isObserver, testStatus } = useShopTest();
  if (!isObserver) return null;

  return (
    <div
      data-testid="observer-banner"
      className="bg-indigo-600 text-white text-center text-sm py-1.5 px-4"
    >
      👁️ Observer Mode — You are watching the agent in real time
      {testStatus === "scored" && " — Test Complete"}
    </div>
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
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <a
          href={`/test-shop/${testId}${qs}`}
          data-testid="link-shop-home"
          className="text-lg font-bold text-gray-900 tracking-tight"
        >
          TestShop
        </a>
        <a
          href={`/test-shop/${testId}/cart${qs}`}
          data-testid="link-cart"
          className="relative text-gray-700 hover:text-gray-900 transition-colors"
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
      <div className="animate-pulse text-gray-400 text-lg">Loading test shop...</div>
    </div>
  );
}

function ShopShell({ children }: { children: ReactNode }) {
  const { isLoading } = useShopTest();

  if (isLoading) return <LoadingShell />;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ObserverBanner />
      <ShopHeader />
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
