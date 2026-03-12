"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";

interface LinkData {
  amount_usd: number;
  description: string;
  bot_name: string;
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const pl = searchParams.get("pl");
  const [data, setData] = useState<LinkData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pl) {
      setLoading(false);
      return;
    }
    fetch(`/api/v1/payment-links/${pl}`)
      .then((res) => res.ok ? res.json() : null)
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pl]);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-neutral-100 p-10 max-w-md w-full text-center" data-testid="payment-success-card">
      {loading ? (
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400 mx-auto" />
      ) : (
        <>
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2" data-testid="text-success-title">
            Payment Received!
          </h1>
          {data ? (
            <div className="mt-4 space-y-2">
              <p className="text-lg font-semibold text-green-600" data-testid="text-success-amount">
                ${data.amount_usd.toFixed(2)}
              </p>
              <p className="text-sm text-neutral-500" data-testid="text-success-description">
                {data.description}
              </p>
              <p className="text-sm text-neutral-400 mt-4">
                The funds have been credited to <span className="font-medium text-neutral-600">{data.bot_name}</span>&apos;s wallet.
              </p>
            </div>
          ) : (
            <p className="text-sm text-neutral-500 mt-4">
              The payment has been processed and the bot has been credited. You can close this page.
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-6">
      <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin text-neutral-400" />}>
        <PaymentSuccessContent />
      </Suspense>
    </div>
  );
}
