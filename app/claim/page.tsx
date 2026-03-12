"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { AuthDrawer } from "@/components/auth-drawer";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle, AlertCircle, Bot, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ClaimPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-neutral-500 font-medium">Loading...</p>
        </div>
      </div>
    }>
      <ClaimPageContent />
    </Suspense>
  );
}

function ClaimPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [token, setToken] = useState(searchParams.get("token") || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    bot_name?: string;
    bot_id?: string;
    message?: string;
    error?: string;
  } | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    const urlToken = searchParams.get("token");
    if (urlToken) setToken(urlToken);
  }, [searchParams]);

  async function handleClaim() {
    if (!token.trim()) return;

    if (!user) {
      setShowAuth(true);
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/v1/bots/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim_token: token.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({
          success: true,
          bot_name: data.bot_name,
          bot_id: data.bot_id,
          message: data.message,
        });
      } else {
        setResult({
          success: false,
          error: data.error || "Something went wrong. Please try again.",
        });
      }
    } catch {
      setResult({
        success: false,
        error: "Network error. Please check your connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-neutral-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/images/logo-claw-chip.png" alt="CreditClaw" width={40} height={40} className="object-contain" />
            <span className="font-bold text-xl tracking-tight text-neutral-900">CreditClaw</span>
          </Link>
        </div>

        {result?.success ? (
          <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-8 text-center animate-fade-in-up" data-testid="claim-success">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">Bot Claimed!</h1>
            <p className="text-neutral-500 mb-2">
              You&apos;ve successfully claimed <span className="font-semibold text-neutral-900">{result.bot_name}</span>.
            </p>
            <p className="text-sm text-neutral-400 mb-6">
              Its wallet is now active. Head to your dashboard to manage it.
            </p>
            <Button
              onClick={() => router.push("/overview")}
              className="w-full rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white gap-2"
              data-testid="button-go-to-dashboard"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-8 animate-fade-in-up">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 text-center mb-2">Claim Your Bot</h1>
            <p className="text-neutral-500 text-center text-sm mb-6">
              Enter the claim token from your registration email to link this bot to your account.
            </p>

            {!user && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Sign in required</p>
                  <p className="text-xs text-amber-600 mt-1">
                    You need to sign in before claiming a bot.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="claim-token" className="block text-sm font-medium text-neutral-700 mb-2">
                  Claim Token
                </label>
                <Input
                  id="claim-token"
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="e.g. coral-X9K2"
                  className="rounded-xl font-mono text-sm"
                  data-testid="input-claim-token"
                  onKeyDown={(e) => e.key === "Enter" && handleClaim()}
                />
              </div>

              {result && !result.success && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3" data-testid="claim-error">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{result.error}</p>
                </div>
              )}

              <Button
                onClick={user ? handleClaim : () => setShowAuth(true)}
                disabled={loading || !token.trim()}
                className="w-full rounded-xl bg-primary hover:bg-primary/90 text-white gap-2 shadow-md shadow-primary/20"
                data-testid="button-claim-bot"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Claiming...
                  </>
                ) : user ? (
                  "Claim This Bot"
                ) : (
                  "Sign In to Claim"
                )}
              </Button>

              {user && (
                <p className="text-xs text-neutral-400 text-center">
                  Signed in as <span className="font-medium text-neutral-600">{user.email}</span>
                </p>
              )}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-neutral-400 mt-6">
          <Link href="/" className="hover:text-neutral-600 transition-colors">
            Back to CreditClaw.com
          </Link>
        </p>
      </div>

      <AuthDrawer open={showAuth} onOpenChange={setShowAuth} />
    </div>
  );
}
