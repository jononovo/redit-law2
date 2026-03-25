"use client";

import { useState } from "react";
import { Star, X, Send, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PurchaseFeedbackPromptProps {
  brandSlug: string;
  brandName: string;
  onDismiss: () => void;
}

function RatingRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-medium text-neutral-700 min-w-[140px]">{label}</span>
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i + 1)}
            className="p-0.5 hover:scale-110 transition-transform"
            data-testid={`rating-${label.toLowerCase().replace(/\s+/g, "-")}-${i + 1}`}
          >
            <Star
              className={`w-5 h-5 ${
                i < value ? "text-amber-400 fill-amber-400" : "text-neutral-200 hover:text-amber-200"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function PurchaseFeedbackPrompt({ brandSlug, brandName, onDismiss }: PurchaseFeedbackPromptProps) {
  const [searchAccuracy, setSearchAccuracy] = useState(0);
  const [stockReliability, setStockReliability] = useState(0);
  const [checkoutCompletion, setCheckoutCompletion] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = searchAccuracy > 0 && stockReliability > 0 && checkoutCompletion > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/bot/skills/${brandSlug}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          search_accuracy: searchAccuracy,
          stock_reliability: stockReliability,
          checkout_completion: checkoutCompletion,
          checkout_method: "browser_automation",
          outcome: "success",
          comment: comment || undefined,
        }),
      });
      if (!res.ok) {
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
      setTimeout(onDismiss, 2000);
    } catch {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-green-100 bg-green-50 p-4 mb-4" data-testid="feedback-submitted">
        <p className="text-sm font-medium text-green-700 text-center">
          Thanks for your feedback! This helps improve the skill for everyone.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-5 mb-4" data-testid="feedback-prompt">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-bold text-neutral-900">
            Your agent bought from {brandName}. How did it go?
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="text-neutral-400 hover:text-neutral-600 transition-colors"
          data-testid="button-dismiss-feedback"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2.5 mb-4">
        <RatingRow label="Search Accuracy" value={searchAccuracy} onChange={setSearchAccuracy} />
        <RatingRow label="Stock Reliability" value={stockReliability} onChange={setStockReliability} />
        <RatingRow label="Checkout Completion" value={checkoutCompletion} onChange={setCheckoutCompletion} />
      </div>

      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Optional — what happened?"
        className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-amber-300/50 mb-3"
        maxLength={500}
        data-testid="input-feedback-comment"
      />

      <Button
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className="w-full rounded-xl"
        size="sm"
        data-testid="button-submit-feedback"
      >
        <Send className="w-3.5 h-3.5 mr-1.5" />
        {submitting ? "Submitting..." : "Submit Feedback"}
      </Button>
    </div>
  );
}
