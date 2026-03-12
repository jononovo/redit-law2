"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Sparkles, Check, Clock, Rocket, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { TransactionLedger } from "@/components/transaction-ledger";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

const ROTATING_PHRASES = [
  "a Credit Card.",
  "a Wallet.",
  "Products.",
  "a Store Front.",
  "Invoicing.",
  "Accounting.",
  "a Business.",
];

export function Hero() {
  const router = useRouter();
  const { toast } = useToast();

  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsAnimating(true);
      timeoutRef.current = setTimeout(() => {
        setPhraseIndex((prev) => (prev + 1) % ROTATING_PHRASES.length);
        setIsAnimating(false);
      }, 300);
    }, 2500);
    return () => {
      clearInterval(timer);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDecision, setShowDecision] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "hero" }),
      });

      if (res.ok) {
        setShowDecision(true);
      } else {
        toast({ title: "Something went wrong", description: "Please try again in a moment.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Something went wrong", description: "Please try again in a moment.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeepWaiting = () => {
    setShowDecision(false);
    setShowConfirmation(true);
  };

  const handleTryNow = () => {
    setShowDecision(false);
    router.push("/onboarding");
  };

  const avatars = [
    { type: 'image' as const, src: '/images/avatar_1.jpg' },
    { type: 'initial' as const, text: 'JD', color: 'bg-blue-100 text-blue-700' },
    { type: 'image' as const, src: '/images/avatar_2.jpg' },
    { type: 'image' as const, src: '/images/avatar_3.jpg' },
    { type: 'initial' as const, text: 'TS', color: 'bg-orange-100 text-orange-700' },
  ];

  return (
    <>
      <section className="relative min-h-[90vh] flex items-center pt-24 overflow-hidden bg-background">
        
        <div className="absolute top-20 right-20 w-[600px] h-[600px] bg-orange-200/40 rounded-full blur-[100px] pointer-events-none mix-blend-multiply animate-pulse" />
        <div className="absolute bottom-20 left-20 w-[500px] h-[500px] bg-blue-200/40 rounded-full blur-[80px] pointer-events-none mix-blend-multiply" />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-purple-200/40 rounded-full blur-[80px] pointer-events-none mix-blend-multiply -translate-x-1/2 -translate-y-1/2" />

        <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center relative z-10">
          
          <div className="space-y-8 text-center lg:text-left">
            <div 
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100 text-orange-700 font-bold text-sm animate-fade-in-up"
            >
              <Sparkles size={14} className="text-orange-500" />
              <span>Pocket money for your bots!</span>
            </div>

            <h1 
              style={{ animationDelay: '0.1s' }}
              className="text-5xl md:text-7xl font-extrabold tracking-tight text-neutral-900 leading-[1.1] animate-fade-in-up"
            >
              Give your <span className="text-primary">Claw Agent</span>{" "}
              <span className="inline-block overflow-hidden" style={{ height: "1em" }}>
                <span
                  className="inline-block transition-all duration-300 ease-in-out"
                  style={{
                    transform: isAnimating ? "translateY(-100%)" : "translateY(0)",
                    opacity: isAnimating ? 0 : 1,
                  }}
                  data-testid="text-rotating-phrase"
                >
                  {ROTATING_PHRASES[phraseIndex]}
                </span>
              </span>
            </h1>

            <p 
              style={{ animationDelay: '0.2s' }}
              className="text-xl text-neutral-600 max-w-lg mx-auto lg:mx-0 leading-relaxed font-medium animate-fade-in-up"
            >
              Your bot works hard. Give it an allowance with guardrails. Self-hosted cards are live &mdash; wallets and x402 coming next.
            </p>

            <div 
              style={{ animationDelay: '0.3s' }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fade-in-up"
            >
              {showConfirmation ? (
                 <div className="h-14 px-8 rounded-full bg-green-50 text-green-700 border border-green-200 font-bold text-lg flex items-center gap-2 shadow-sm animate-in fade-in zoom-in duration-300">
                   <Check className="w-5 h-5" />
                   <span>You&apos;re on the list!</span>
                 </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
                  <Link href="/onboarding" className="w-full sm:w-auto">
                    <Button className="h-14 px-8 rounded-full text-lg font-bold w-full gap-2" data-testid="button-get-started">
                      Get Started
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  </Link>
                  <form onSubmit={handleJoin} className="relative w-full group">
                    <Input 
                      type="email"
                      placeholder="or join waitlist" 
                      className="h-14 pl-6 pr-14 rounded-full bg-white border-2 border-neutral-100 shadow-lg shadow-neutral-900/5 text-base text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-primary focus-visible:border-primary transition-all duration-300"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      data-testid="input-waitlist-email"
                    />
                    <Button 
                      type="submit" 
                      size="icon" 
                      disabled={isSubmitting}
                      className="absolute right-1.5 top-1.5 h-11 w-11 rounded-full bg-transparent text-neutral-400 hover:bg-neutral-900 hover:text-white hover:scale-105 transition-all duration-200"
                      data-testid="button-waitlist-submit"
                    >
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </form>
                </div>
              )}
            </div>

            <div 
              style={{ animationDelay: '0.5s' }}
              className="pt-0 -mt-2 flex items-center justify-center lg:justify-start gap-2 text-sm font-semibold text-neutral-500 animate-fade-in-up"
            >
               <span className="flex -space-x-3">
                  {avatars.map((avatar, i) => (
                      <div key={i} className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center overflow-hidden ${avatar.type === 'initial' ? avatar.color : 'bg-neutral-200'}`}>
                          {avatar.type === 'image' ? (
                              <Image src={avatar.src} alt="User" width={32} height={32} className="w-full h-full object-cover" />
                          ) : (
                              <span className="text-[10px] font-bold">{avatar.text}</span>
                          )}
                      </div>
                  ))}
               </span>
               <span className="ml-2">Join 14,000+ happy bot owners</span>
            </div>
          </div>

          <div className="relative flex flex-col items-center justify-center perspective-[1000px]">
              <div 
                className="relative w-full max-w-[500px] z-10 animate-pop-in"
              >
                  <Image 
                      src="/images/fun-lobster-black-card.png"
                      alt="Fun 3D Claw Card" 
                      width={500}
                      height={500}
                      className="w-full h-auto drop-shadow-2xl transition-transform duration-500"
                      priority
                  />
                   
                   <div className="absolute -top-4 -right-4 animate-float">
                     <div className="bg-white p-3 rounded-2xl shadow-xl border border-neutral-100 rotate-6">
                        <span className="text-2xl">🍕</span>
                     </div>
                   </div>

                   <div className="absolute bottom-10 -left-8 animate-float-delayed">
                     <div className="bg-white p-3 rounded-2xl shadow-xl border border-neutral-100 -rotate-12">
                        <span className="text-2xl">🤖</span>
                     </div>
                   </div>

                   <div className="absolute -bottom-12 right-0 md:-right-12">
                      <TransactionLedger />
                   </div>
              </div>
          </div>
        </div>
      </section>

      {showDecision && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" data-testid="modal-decision">
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full mx-4 p-8 md:p-10 animate-in zoom-in-95 fade-in duration-300">
            <button
              onClick={() => setShowDecision(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 transition-colors"
              data-testid="button-close-decision"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-extrabold text-neutral-900 mb-2">
                You&apos;re on the list!
              </h2>
              <p className="text-neutral-500 font-medium">
                We saved your spot. Now, what would you like to do?
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleTryNow}
                className="w-full p-5 rounded-2xl border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-all text-left group cursor-pointer"
                data-testid="button-try-now"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Rocket className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-neutral-900 text-lg">Let me try it now</p>
                    <p className="text-sm text-neutral-500 mt-1">
                      Add your own credit card and set strict spending rules for your bot. You stay in full control.
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={handleKeepWaiting}
                className="w-full p-5 rounded-2xl border-2 border-neutral-200 hover:border-neutral-300 bg-white hover:bg-neutral-50 transition-all text-left group cursor-pointer"
                data-testid="button-keep-waiting"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Clock className="w-6 h-6 text-neutral-500" />
                  </div>
                  <div>
                    <p className="font-bold text-neutral-900 text-lg">Keep me on the waitlist</p>
                    <p className="text-sm text-neutral-500 mt-1">
                      We&apos;ll notify you when bot wallets are ready. No action needed right now.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
