"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/platform-management/auth/auth-context";
import { WizardStep } from "../wizard-step";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { wt } from "@/lib/wizard-typography";
import { Mail, Chrome, Github, Loader2 } from "lucide-react";

interface SignInStepProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
}

export function SignInStep({ currentStep, totalSteps, onBack, onNext }: SignInStepProps) {
  const { user, loading: authLoading, signInWithGoogle, signInWithGithub, sendMagicLink } = useAuth();
  const [email, setEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasAdvanced = useRef(false);

  useEffect(() => {
    if (user && !hasAdvanced.current) {
      hasAdvanced.current = true;
      onNext();
    }
  }, [user, onNext]);

  if (authLoading) {
    return (
      <WizardStep
        title="Sign in to continue"
        subtitle="Create an account or sign in so we can securely set up your bot."
        currentStep={currentStep}
        totalSteps={totalSteps}
        onBack={onBack}
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </WizardStep>
    );
  }

  if (user) {
    return null;
  }

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGithub = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGithub();
    } catch (err: any) {
      setError(err?.message || "GitHub sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setLoading(true);
    try {
      await sendMagicLink(email.trim());
      setMagicLinkSent(true);
    } catch (err: any) {
      setError(err?.message || "Failed to send magic link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <WizardStep
      title="Sign in to continue"
      subtitle="Create an account or sign in so we can securely set up your bot."
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
    >
      <div className="space-y-6">
        <div className="space-y-3">
          <Button
            data-testid="button-onboarding-sign-in-google"
            variant="outline"
            className={`w-full ${wt.secondaryButton} font-semibold gap-3 cursor-pointer`}
            onClick={handleGoogle}
            disabled={loading}
          >
            <Chrome className="w-5 h-5" />
            Continue with Google
          </Button>

          <Button
            data-testid="button-onboarding-sign-in-github"
            variant="outline"
            className={`w-full ${wt.secondaryButton} font-semibold gap-3 cursor-pointer`}
            onClick={handleGithub}
            disabled={loading}
          >
            <Github className="w-5 h-5" />
            Continue with GitHub
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-neutral-50 px-3 text-neutral-400 font-medium">or</span>
          </div>
        </div>

        {magicLinkSent ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-bold text-lg" data-testid="text-magic-link-sent">Check your email</h3>
            <p className="text-sm text-neutral-500">
              We sent a sign-in link to <span className="font-medium text-neutral-700">{email}</span>
            </p>
            <Button
              variant="ghost"
              className="text-sm cursor-pointer"
              onClick={() => setMagicLinkSent(false)}
              data-testid="button-use-different-email"
            >
              Use a different email
            </Button>
          </div>
        ) : (
          <form onSubmit={handleMagicLink} className="space-y-3">
            <Input
              data-testid="input-onboarding-email-magic-link"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 md:h-14 rounded-xl"
              required
            />
            <Button
              data-testid="button-onboarding-send-magic-link"
              type="submit"
              className={`w-full ${wt.primaryButton} bg-primary text-white hover:bg-primary/90 font-semibold cursor-pointer`}
              disabled={loading || !email.trim()}
            >
              <Mail className="w-4 h-4 mr-2" />
              Send Magic Link
            </Button>
          </form>
        )}

        {error && (
          <p data-testid="text-onboarding-auth-error" className="text-sm text-red-500 text-center">{error}</p>
        )}

        <p className="text-xs text-neutral-400 text-center leading-relaxed">
          By signing in, you agree to our Terms of Service and Privacy Policy.
          No passwords — we use secure sign-in only.
        </p>
      </div>
    </WizardStep>
  );
}
