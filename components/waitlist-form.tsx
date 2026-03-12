"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Rocket, Clock, X } from "lucide-react";

const formSchema = z.object({
  email: z.string().email({
    message: "That doesn't look like a valid email.",
  }),
});

function Counter({ value }: { value: number }) {
  return <span>{value.toLocaleString()}</span>;
}

export function WaitlistForm() {
  const router = useRouter();
  const [count, setCount] = useState(14203);
  const [showDecision, setShowDecision] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        setCount(c => c + Math.floor(Math.random() * 3) + 1);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email, source: "footer" }),
      });
      if (res.ok) {
        setCount(c => c + 1);
        setShowDecision(true);
      }
    } catch {
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleKeepWaiting = () => {
    setShowDecision(false);
    setShowConfirmation(true);
  };

  const handleTryNow = () => {
    setShowDecision(false);
    router.push("/onboarding");
  };

  return (
    <>
      <section className="py-24 bg-neutral-900 text-white relative overflow-hidden">
        
        <div className="absolute top-0 right-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="container mx-auto px-6 max-w-3xl text-center relative z-10">
          
          <div className="inline-block mb-8">
              <div className="px-6 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 font-medium flex items-center gap-3">
                   <div className="flex -space-x-2">
                      <div className="w-6 h-6 rounded-full bg-green-400 border-2 border-neutral-900" />
                      <div className="w-6 h-6 rounded-full bg-blue-400 border-2 border-neutral-900" />
                      <div className="w-6 h-6 rounded-full bg-orange-400 border-2 border-neutral-900" />
                   </div>
                   <span><Counter value={count} /> people waiting</span>
              </div>
          </div>

          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
              Ready to put your bot&apos;s spending on autopilot?
          </h2>
          <p className="text-xl text-neutral-400 mb-12 font-medium max-w-xl mx-auto">
              Join the waitlist for bot wallets, or jump in now with self-hosted cards and full spending controls.
          </p>

          {showConfirmation ? (
            <div className="h-14 px-8 rounded-full bg-green-900/30 text-green-400 border border-green-800 font-bold text-lg flex items-center gap-2 shadow-sm animate-in fade-in zoom-in duration-300 w-fit mx-auto">
              <Check className="w-5 h-5" />
              <span>You&apos;re on the list!</span>
            </div>
          ) : (
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                    <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem className="flex-1">
                        <FormControl>
                            <Input 
                                placeholder="your@email.com" 
                                {...field} 
                                className="h-14 px-6 bg-white text-neutral-900 border-transparent rounded-full focus-visible:ring-primary text-lg placeholder:text-neutral-400"
                                data-testid="input-footer-email"
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="h-14 px-8 rounded-full bg-primary text-white hover:bg-primary/90 font-bold text-lg shadow-lg shadow-primary/25"
                      data-testid="button-footer-submit"
                    >
                      Join the List
                    </Button>
                </form>
            </Form>
          )}
          
        </div>
      </section>

      {showDecision && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" data-testid="modal-decision-footer">
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full mx-4 p-8 md:p-10 animate-in zoom-in-95 fade-in duration-300">
            <button
              onClick={() => setShowDecision(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 transition-colors"
              data-testid="button-close-decision-footer"
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
                data-testid="button-try-now-footer"
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
                data-testid="button-keep-waiting-footer"
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
