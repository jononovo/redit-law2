"use client";

import { useState } from "react";
import { Loader2, CreditCard, Download, CheckCircle2 } from "lucide-react";
import { WizardStep } from "../wizard-step";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/auth-fetch";
import { encryptCardDetails, buildEncryptedCardFile, downloadEncryptedFile } from "@/lib/card/onboarding-rail5/encrypt";

interface CardEntryProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  botId?: string;
  botName?: string;
}

import { detectCardBrand, brandToApiValue } from "@/lib/card/card-brand";

const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 12 }, (_, i) => String(currentYear + i));

export function CardEntry({ currentStep, totalSteps, onBack, onNext, botId }: CardEntryProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [deliveryResult, setDeliveryResult] = useState<{ delivered: boolean; method: string } | null>(null);

  const [cardNumber, setCardNumber] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [holderName, setHolderName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");

  async function handleSubmit() {
    if (!cardNumber.trim() || !cardCvv.trim() || !expMonth || !expYear || !holderName.trim()) {
      toast({ title: "Missing info", description: "Please fill in all required card details.", variant: "destructive" });
      return;
    }

    const cleanNumber = cardNumber.replace(/\s/g, "");
    const cardLast4 = cleanNumber.slice(-4);
    const cardBrand = brandToApiValue(detectCardBrand(cleanNumber));

    setLoading(true);
    try {
      const initRes = await authFetch("/api/v1/rail5/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_name: "My Card", card_brand: cardBrand, card_last4: cardLast4 }),
      });
      if (!initRes.ok) {
        const err = await initRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to initialize card");
      }
      const { card_id: cardId } = await initRes.json();

      if (botId) {
        try {
          await authFetch(`/api/v1/rail5/cards/${cardId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bot_id: botId }),
          });
        } catch {}
      }

      const { keyHex, ivHex, tagHex, ciphertextBytes } = await encryptCardDetails({
        number: cleanNumber,
        cvv: cardCvv,
        exp_month: parseInt(expMonth),
        exp_year: parseInt(expYear),
        name: holderName,
        address: address || undefined,
        city: city || undefined,
        state: state || undefined,
        zip: zip || undefined,
      });

      const keyRes = await authFetch("/api/v1/rail5/submit-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_id: cardId, key_hex: keyHex, iv_hex: ivHex, tag_hex: tagHex }),
      });
      if (!keyRes.ok) {
        const err = await keyRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to submit key");
      }

      const cardName = "My Card";
      const md = buildEncryptedCardFile(ciphertextBytes, cardName, cardLast4, cardId);

      if (botId) {
        try {
          const sendRes = await authFetch("/api/v1/bot-messages/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bot_id: botId,
              event_type: "rail5.card.delivered",
              payload: {
                card_id: cardId,
                card_name: cardName,
                card_last4: cardLast4,
                file_content: md,
                suggested_path: `.creditclaw/cards/Card-${cardName.replace(/[^a-zA-Z0-9-]/g, "")}-${cardLast4}.md`,
                instructions: "Save this file to .creditclaw/cards/ — it is self-contained with decrypt script and encrypted data. Your bot will receive the decryption key at checkout time via CreditClaw API.",
              },
            }),
          });
          if (sendRes.ok) {
            const result = await sendRes.json();
            setDeliveryResult({ delivered: result.delivered, method: result.method });
          }
        } catch {}
      }

      downloadEncryptedFile(md, `Card-MyCard-${cardLast4}.md`);

      setCardNumber("");
      setCardCvv("");
      setExpMonth("");
      setExpYear("");
      setHolderName("");
      setAddress("");
      setCity("");
      setState("");
      setZip("");

      setSuccess(true);
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to encrypt card.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <WizardStep
        title="Card Added Successfully"
        subtitle="Your card has been encrypted and securely stored."
        currentStep={currentStep}
        totalSteps={totalSteps}
        onBack={onBack}
        showBack={false}
      >
        <div className="text-center space-y-6" data-testid="card-entry-success">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          {deliveryResult?.delivered ? (
            <p className="text-sm text-neutral-500" data-testid="text-delivery-webhook">
              Your bot received the encrypted card file via webhook. A backup copy has been downloaded.
            </p>
          ) : deliveryResult?.method === "pending_message" ? (
            <p className="text-sm text-neutral-500" data-testid="text-delivery-pending">
              Your encrypted card file has been staged for your bot to pick up. A backup copy has been downloaded. Your bot can retrieve it via <code className="text-xs bg-neutral-100 px-1 py-0.5 rounded">GET /api/v1/bot/messages</code>.
            </p>
          ) : (
            <p className="text-sm text-neutral-500" data-testid="text-delivery-download">
              Your encrypted card file has been downloaded as a backup.
            </p>
          )}
          <Button onClick={onNext} className="w-full gap-2" data-testid="button-card-entry-continue">
            Continue
          </Button>
        </div>
      </WizardStep>
    );
  }

  return (
    <WizardStep
      title="Enter your card details"
      subtitle="Your card is encrypted in your browser. CreditClaw never sees your card number."
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
    >
      <div className="space-y-4" data-testid="card-entry-form">
        <div>
          <Label htmlFor="onb-card-number">Card Number</Label>
          <Input
            id="onb-card-number"
            placeholder="4111 1111 1111 1111"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value.replace(/[^\d\s]/g, "").slice(0, 23))}
            data-testid="input-card-number"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Month</Label>
            <Select value={expMonth} onValueChange={setExpMonth}>
              <SelectTrigger data-testid="select-exp-month">
                <SelectValue placeholder="MM" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Year</Label>
            <Select value={expYear} onValueChange={setExpYear}>
              <SelectTrigger data-testid="select-exp-year">
                <SelectValue placeholder="YYYY" />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="onb-cvv">CVV</Label>
            <Input
              id="onb-cvv"
              type="password"
              placeholder="123"
              maxLength={4}
              value={cardCvv}
              onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
              data-testid="input-cvv"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="onb-holder">Cardholder Name</Label>
          <Input
            id="onb-holder"
            placeholder="Harry Smith"
            value={holderName}
            onChange={(e) => setHolderName(e.target.value)}
            data-testid="input-holder-name"
          />
        </div>

        <div>
          <Label htmlFor="onb-address">Street Address <span className="text-neutral-400 font-normal">(optional)</span></Label>
          <Input
            id="onb-address"
            placeholder="123 Main St"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            data-testid="input-address"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="onb-city">City</Label>
            <Input id="onb-city" placeholder="New York" value={city} onChange={(e) => setCity(e.target.value)} data-testid="input-city" />
          </div>
          <div>
            <Label htmlFor="onb-state">State</Label>
            <Input id="onb-state" placeholder="NY" maxLength={2} value={state} onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))} data-testid="input-state" />
          </div>
          <div>
            <Label htmlFor="onb-zip">ZIP</Label>
            <Input id="onb-zip" placeholder="10001" value={zip} onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 10))} data-testid="input-zip" />
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={loading} className="w-full gap-2 mt-2" data-testid="button-card-entry-submit">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Encrypting & Saving…
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              Encrypt & Save Card
            </>
          )}
        </Button>

        <div className="flex items-center gap-2 justify-center text-xs text-neutral-400 mt-3">
          <Download className="w-3.5 h-3.5" />
          <span>An encrypted backup file will be downloaded automatically.</span>
        </div>
      </div>
    </WizardStep>
  );
}
