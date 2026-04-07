"use client";

import type { ElementType } from "react";
import { useRouter } from "next/navigation";
import { Wallet, ShoppingCart, Shield, CreditCard } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface CardTypeOption {
  icon: ElementType;
  label: string;
  description: string;
  href: string;
  color: string;
  iconBg: string;
  borderColor: string;
  comingSoon?: boolean;
}

const cardTypes: CardTypeOption[] = [
  {
    icon: Shield,
    label: "My Card - Encrypted",
    description: "Bring your own card. Encrypted and split between you and CreditClaw.",
    href: "/setup/rail5",
    color: "text-emerald-600",
    iconBg: "bg-emerald-50",
    borderColor: "border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/50",
  },
  {
    icon: Wallet,
    label: "Crypto Wallet",
    description: "Fund bots with USDC on Base via Stripe. Bots pay for API resources using the x402 protocol.",
    href: "/stripe-wallet",
    color: "text-blue-600",
    iconBg: "bg-blue-50",
    borderColor: "border-blue-200 hover:border-blue-400 hover:bg-blue-50/50",
  },
  {
    icon: ShoppingCart,
    label: "Card Wallet",
    description: "CrossMint-powered wallets for AI agent commerce. Bots buy real products with your approval.",
    href: "/card-wallet",
    color: "text-violet-600",
    iconBg: "bg-violet-50",
    borderColor: "border-violet-200 hover:border-violet-400 hover:bg-violet-50/50",
  },
  {
    icon: CreditCard,
    label: "Virtual Card",
    description: "CreditClaw issues a virtual card for your bot with built-in spending controls.",
    href: "/cards",
    color: "text-neutral-400",
    iconBg: "bg-neutral-100",
    borderColor: "border-neutral-100",
    comingSoon: true,
  },
];

interface NewCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewCardModal({ open, onOpenChange }: NewCardModalProps) {
  const router = useRouter();

  const handleSelect = (option: CardTypeOption) => {
    if (option.comingSoon) return;
    onOpenChange(false);
    router.push(option.href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 rounded-2xl overflow-hidden">
        <div className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold text-neutral-900">
            Add a New Card
          </DialogTitle>
          <DialogDescription className="text-sm text-neutral-500 mt-1">
            Choose how you want your bot to handle payments.
          </DialogDescription>
        </div>

        <div className="px-6 pb-6 pt-3 space-y-3">
          {cardTypes.map((option) => (
            <button
              key={option.label}
              onClick={() => handleSelect(option)}
              disabled={option.comingSoon}
              className={cn(
                "w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all",
                option.comingSoon
                  ? "border-neutral-100 bg-neutral-50/50 cursor-not-allowed opacity-60"
                  : cn(option.borderColor, "cursor-pointer")
              )}
              data-testid={`button-select-${option.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5",
                option.iconBg
              )}>
                <option.icon className={cn("w-5 h-5", option.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "font-semibold",
                    option.comingSoon ? "text-neutral-400" : "text-neutral-900"
                  )}>
                    {option.label}
                  </span>
                  {option.comingSoon && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 bg-neutral-200/60 px-2 py-0.5 rounded-full">
                      Coming Soon
                    </span>
                  )}
                </div>
                <p className={cn(
                  "text-sm mt-0.5 leading-relaxed",
                  option.comingSoon ? "text-neutral-400" : "text-neutral-500"
                )}>
                  {option.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
