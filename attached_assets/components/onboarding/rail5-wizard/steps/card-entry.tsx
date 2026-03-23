"use client";

import { Loader2, ArrowRight, ArrowLeft, Lock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { wt } from "@/lib/wizard-typography";
import { Rail5InteractiveCard } from "@/lib/card/onboarding-rail5/interactive-card";
import { type CardBrand } from "@/lib/card/card-brand";
import { type CardFieldErrors } from "@/lib/card/hooks";

interface CardEntryProps {
  cardNumber: string;
  setCardNumber: (v: string) => void;
  expMonth: string;
  setExpMonth: (v: string) => void;
  expYear: string;
  setExpYear: (v: string) => void;
  cardCvv: string;
  setCardCvv: (v: string) => void;
  holderName: string;
  setHolderName: (v: string) => void;
  cardErrors: CardFieldErrors;
  cardEncrypting: boolean;
  cardEncrypted: boolean;
  detectedBrand: CardBrand;
  onEncryptCard: () => void;
  onRestartCard: () => void;
  onCardDetailsNext: () => void;
  onBack: () => void;
}

export function CardEntry({
  cardNumber, setCardNumber,
  expMonth, setExpMonth,
  expYear, setExpYear,
  cardCvv, setCardCvv,
  holderName, setHolderName,
  cardErrors, cardEncrypting, cardEncrypted,
  detectedBrand,
  onEncryptCard, onRestartCard, onCardDetailsNext,
  onBack,
}: CardEntryProps) {
  return (
    <div className="space-y-6" data-testid="r5-step-card-entry">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
          <Lock className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className={wt.title}>Enter Card Details</h2>
      </div>

      <Rail5InteractiveCard
        cardNumber={cardNumber}
        onCardNumberChange={setCardNumber}
        expiryMonth={expMonth}
        expiryYear={expYear}
        onExpiryMonthChange={setExpMonth}
        onExpiryYearChange={setExpYear}
        cvv={cardCvv}
        onCvvChange={setCardCvv}
        holderName={holderName}
        onHolderNameChange={setHolderName}
        detectedBrand={detectedBrand}
        errors={cardErrors}
        isEncrypting={cardEncrypting || cardEncrypted}
      />

      <div className="flex gap-3">
        {(cardEncrypting || cardEncrypted) ? (
          <Button
            variant="outline"
            onClick={onRestartCard}
            className={`flex-1 ${wt.secondaryButton} gap-2`}
            data-testid="button-r5-restart-card"
          >
            <RotateCcw className="w-4 h-4" /> Clear Card
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={onBack}
            className={`flex-1 ${wt.secondaryButton} gap-2`}
            data-testid="button-r5-step3-back"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        )}
        <Button
          onClick={cardEncrypted ? onCardDetailsNext : onEncryptCard}
          disabled={cardEncrypting}
          className={`flex-1 ${wt.primaryButton} gap-2 font-semibold shadow-lg transition-all ${
            cardEncrypted
              ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-green-600/25"
              : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-600/25"
          }`}
          data-testid="button-r5-encrypt-card"
        >
          {cardEncrypted ? (
            <>
              Encrypted <ArrowRight className="w-4 h-4" />
            </>
          ) : cardEncrypting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Encrypting...
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" /> Encrypt
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
