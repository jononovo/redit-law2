"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CardDetailShellProps {
  loading: boolean;
  notFound: boolean;
  backHref: string;
  backLabel: string;
  notFoundLabel?: string;
  children?: React.ReactNode;
}

export function CardDetailShell({
  loading,
  notFound,
  backHref,
  backLabel,
  notFoundLabel = "Card not found.",
  children,
}: CardDetailShellProps) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="text-center py-24">
        <CreditCard className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
        <p className="text-lg text-neutral-400 font-medium">{notFoundLabel}</p>
        <Button variant="outline" onClick={() => router.push(backHref)} className="mt-4">
          {backLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-in-up max-w-2xl">
      <Button
        variant="ghost"
        onClick={() => router.push(backHref)}
        className="self-start gap-2 text-neutral-500"
        data-testid="button-card-detail-back"
      >
        <ArrowLeft className="w-4 h-4" /> {backLabel}
      </Button>
      {children}
    </div>
  );
}
