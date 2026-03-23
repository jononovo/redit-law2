"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Chrome, Github } from "lucide-react";

interface AuthDrawerProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AuthDrawer({ children, open: controlledOpen, onOpenChange }: AuthDrawerProps) {
  const { signInWithGoogle, signInWithGithub, sendMagicLink } = useAuth();
  const [email, setEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      setOpen(false);
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
      setOpen(false);
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
    <Sheet open={open} onOpenChange={setOpen}>
      {children && <SheetTrigger asChild>{children}</SheetTrigger>}
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="p-6 pb-2">
            <SheetTitle className="text-2xl font-bold">Welcome to CreditClaw</SheetTitle>
            <p className="text-sm text-neutral-500 mt-1">
              Sign in to manage your bots, wallets, and spending
            </p>
          </SheetHeader>

          <div className="flex-1 p-6 pt-4 space-y-6">
            <div className="space-y-3">
              <Button
                data-testid="button-sign-in-google"
                variant="outline"
                className="w-full h-12 rounded-xl text-sm font-semibold gap-3 cursor-pointer"
                onClick={handleGoogle}
                disabled={loading}
              >
                <Chrome className="w-5 h-5" />
                Continue with Google
              </Button>

              <Button
                data-testid="button-sign-in-github"
                variant="outline"
                className="w-full h-12 rounded-xl text-sm font-semibold gap-3 cursor-pointer"
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
                <span className="bg-white px-3 text-neutral-400 font-medium">or</span>
              </div>
            </div>

            {magicLinkSent ? (
              <div className="text-center py-8 space-y-3">
                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto">
                  <Mail className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="font-bold text-lg">Check your email</h3>
                <p className="text-sm text-neutral-500">
                  We sent a sign-in link to <span className="font-medium text-neutral-700">{email}</span>
                </p>
                <Button
                  variant="ghost"
                  className="text-sm cursor-pointer"
                  onClick={() => setMagicLinkSent(false)}
                >
                  Use a different email
                </Button>
              </div>
            ) : (
              <form onSubmit={handleMagicLink} className="space-y-3">
                <Input
                  data-testid="input-email-magic-link"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl"
                  required
                />
                <Button
                  data-testid="button-send-magic-link"
                  type="submit"
                  className="w-full h-12 rounded-xl bg-primary text-white hover:bg-primary/90 font-semibold cursor-pointer"
                  disabled={loading || !email.trim()}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Magic Link
                </Button>
              </form>
            )}

            {error && (
              <p data-testid="text-auth-error" className="text-sm text-red-500 text-center">{error}</p>
            )}

            <p className="text-xs text-neutral-400 text-center leading-relaxed">
              By signing in, you agree to our Terms of Service and Privacy Policy.
              No passwords — we use secure sign-in only.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
