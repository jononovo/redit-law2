"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/platform-management/auth-fetch";
import { encryptCardDetails, buildEncryptedCardFile, downloadEncryptedFile } from "@/lib/payment-rails/card/onboarding-rail5/encrypt";
import { detectCardBrand, brandToApiValue, getMaxDigits } from "@/lib/payment-rails/card/card-brand";
import { type CardFieldErrors } from "@/lib/payment-rails/card/hooks";
import { RAIL5_CARD_DELIVERED } from "@/lib/platform-management/agent-management/bot-messaging/templates";
import { randomCardName, type BotOption, type SavedCardDetails } from "./types";

interface UseRail5WizardProps {
  onComplete: () => void;
  onClose: () => void;
  preselectedBotId?: string;
}

export function useRail5Wizard({ onComplete, onClose, preselectedBotId }: UseRail5WizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [cardName, setCardName] = useState(randomCardName);
  const [cardId, setCardId] = useState("");

  const [cardNumber, setCardNumber] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [holderName, setHolderName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("US");
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [addressErrors, setAddressErrors] = useState<{ address?: boolean; city?: boolean; zip?: boolean }>({});

  const [encryptionDone, setEncryptionDone] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);
  const [keySent, setKeySent] = useState(false);

  const [spendingLimit, setSpendingLimit] = useState("50");
  const [dailyLimit, setDailyLimit] = useState("100");
  const [monthlyLimit, setMonthlyLimit] = useState("500");
  const [approveAll, setApproveAll] = useState(true);
  const [approvalThreshold, setApprovalThreshold] = useState("25");

  const [bots, setBots] = useState<BotOption[]>([]);
  const [selectedBotId, setSelectedBotId] = useState(preselectedBotId || "");
  const [botsLoading, setBotsLoading] = useState(false);
  const [botsFetched, setBotsFetched] = useState(false);

  const [directDeliverySucceeded, setDirectDeliverySucceeded] = useState(false);
  const [deliveryAttempted, setDeliveryAttempted] = useState(false);
  const [deliveryResult, setDeliveryResult] = useState<{ delivered: boolean; method: string; messageId?: number; expiresAt?: string } | null>(null);
  const [storedFileContent, setStoredFileContent] = useState("");
  const [cardEncrypting, setCardEncrypting] = useState(false);
  const [cardEncrypted, setCardEncrypted] = useState(false);

  const [savedCardDetails, setSavedCardDetails] = useState<SavedCardDetails | null>(null);

  const [cardErrors, setCardErrors] = useState<CardFieldErrors>({});
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const cardLast4 = cardNumber.replace(/\s/g, "").slice(-4);
  const detectedBrand = detectCardBrand(cardNumber);
  const cardBrand = brandToApiValue(detectedBrand);

  useEffect(() => {
    if (Object.keys(cardErrors).length === 0) return;
    const cleanNum = cardNumber.replace(/\s/g, "");
    const brand = detectCardBrand(cardNumber);
    const minCvvLen = brand === "amex" ? 4 : 3;
    const resolved: CardFieldErrors = {};
    if (cardErrors.number && cleanNum.length === getMaxDigits(brand)) resolved.number = false;
    if (cardErrors.month && expMonth) resolved.month = false;
    if (cardErrors.year && expYear) resolved.year = false;
    if (cardErrors.cvv && cardCvv.length >= minCvvLen) resolved.cvv = false;
    if (cardErrors.name && holderName.trim()) resolved.name = false;
    if (Object.keys(resolved).length > 0) {
      setCardErrors(prev => {
        const next = { ...prev };
        for (const k of Object.keys(resolved) as (keyof CardFieldErrors)[]) delete next[k];
        return next;
      });
    }
  }, [cardNumber, expMonth, expYear, cardCvv, holderName]);

  useEffect(() => {
    authFetch("/api/v1/rail5/cards").then(res => {
      if (!res.ok) return;
      return res.json();
    }).then(data => {
      if (!data?.cards?.length) return;
      const recent = data.cards[0];
      if (recent.cardholder_name) setHolderName(recent.cardholder_name);
      if (recent.billing_address) setAddress(recent.billing_address);
      if (recent.billing_city) setCity(recent.billing_city);
      if (recent.billing_state) setState(recent.billing_state);
      if (recent.billing_zip) setZip(recent.billing_zip);
      if (recent.billing_country && recent.billing_country !== "US") {
        setCountry(recent.billing_country);
        setShowCountryPicker(true);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (step === 5 && !botsFetched && !botsLoading) {
      fetchBots();
    }
  }, [step, botsFetched, botsLoading]);

  function handleEncryptCard() {
    const cleanNumber = cardNumber.replace(/\s/g, "");
    const expectedDigits = getMaxDigits(detectedBrand);
    const minCvv = detectedBrand === "amex" ? 4 : 3;
    const errs: CardFieldErrors = {
      number: cleanNumber.length !== expectedDigits,
      month: !expMonth,
      year: !expYear,
      cvv: !cardCvv || cardCvv.length < minCvv,
      name: !holderName.trim(),
    };
    if (Object.values(errs).some(Boolean)) {
      setCardErrors(errs);
      return;
    }
    setCardErrors({});
    setCardEncrypting(true);
    setTimeout(() => {
      setCardEncrypting(false);
      setCardEncrypted(true);
    }, 2000);
  }

  function handleRestartCard() {
    setCardEncrypting(false);
    setCardEncrypted(false);
    setCardNumber("");
    setCardCvv("");
    setExpMonth("");
    setExpYear("");
    setHolderName("");
    setCardErrors({});
  }

  function handleRequestClose() {
    if (step !== 7) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  }

  function confirmExit() {
    setShowExitConfirm(false);
    onClose();
  }

  async function handleStep1Next() {
    if (!cardName.trim()) {
      toast({ title: "Missing info", description: "Enter a card name.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch("/api/v1/rail5/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_name: cardName.trim(), card_brand: cardBrand, card_last4: "0000" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to initialize card");
      }
      const data = await res.json();
      setCardId(data.card_id);
      setStep(1);
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to initialize card.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleEncryptAndDownload() {
    const cleanNumber = cardNumber.replace(/\s/g, "");
    if (!cleanNumber || cleanNumber.length < 13 || !cardCvv.trim() || !expMonth || !expYear || !holderName.trim()) {
      toast({ title: "Missing info", description: "Fill in all card details.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { keyHex, ivHex, tagHex, ciphertextBytes } = await encryptCardDetails({
        number: cardNumber.replace(/\s/g, ""),
        cvv: cardCvv,
        exp_month: parseInt(expMonth),
        exp_year: parseInt(expYear),
        name: holderName,
        address: address,
        city: city,
        state: state,
        zip: zip,
        country: country,
      });
      setEncryptionDone(true);

      const res = await authFetch("/api/v1/rail5/submit-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: cardId,
          key_hex: keyHex,
          iv_hex: ivHex,
          tag_hex: tagHex,
          card_last4: cardNumber.replace(/\s/g, "").slice(-4),
          card_brand: cardBrand,
          card_first4: cleanNumber.slice(0, 4),
          exp_month: expMonth,
          exp_year: expYear,
          cardholder_name: holderName,
          billing_address: address || undefined,
          billing_city: city || undefined,
          billing_state: state || undefined,
          billing_zip: zip || undefined,
          billing_country: country || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to submit key");
      }
      setKeySent(true);

      const md = buildEncryptedCardFile(ciphertextBytes, cardName, cardLast4, cardId, {
        bin: cleanNumber.slice(0, 4),
        expMonth,
        expYear,
        cardholderName: holderName,
        brand: cardBrand,
        address,
        city,
        state,
        zip,
        country,
      });
      setStoredFileContent(md);

      const baseName = `Card-${cardName.replace(/[^a-zA-Z0-9-]/g, "")}-${cardLast4}`;

      if (selectedBotId) {
        setDeliveryAttempted(true);
        try {
          const deliverRes = await authFetch("/api/v1/bot-messages/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bot_id: selectedBotId,
              event_type: "rail5.card.delivered",
              payload: {
                card_id: cardId,
                card_name: cardName,
                card_last4: cardLast4,
                file_content: md,
                suggested_path: `.creditclaw/cards/${baseName}.md`,
                instructions: RAIL5_CARD_DELIVERED,
              },
            }),
          });
          if (deliverRes.ok) {
            const deliverData = await deliverRes.json();
            setDeliveryResult(deliverData);
            if (deliverData.delivered) {
              setDirectDeliverySucceeded(true);
            }
          }
        } catch {
        }
      }

      downloadEncryptedFile(md, `${baseName}.md`);
      setDownloadDone(true);

      setSavedCardDetails({
        cardNumber: cardNumber.replace(/\s/g, ""),
        cardExpiry: `${expMonth.padStart(2, "0")}/${expYear.length === 4 ? expYear.slice(-2) : expYear}`,
        cardCvv: cardCvv,
        cardholderName: holderName,
        billingAddress: address,
        billingCity: city,
        billingState: state,
        billingZip: zip,
      });

      setCardNumber("");
      setCardCvv("");
      setExpMonth("");
      setExpYear("");
      setHolderName("");
      setAddress("");
      setCity("");
      setState("");
      setZip("");
      setCountry("US");
      setShowCountryPicker(false);

      setStep(7);
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Encryption failed.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function handleCardDetailsNext() {
    const cleanNumber = cardNumber.replace(/\s/g, "");
    const expectedDigits = getMaxDigits(detectedBrand);
    const minCvv = detectedBrand === "amex" ? 4 : 3;
    const errs: CardFieldErrors = {
      number: cleanNumber.length !== expectedDigits,
      month: !expMonth,
      year: !expYear,
      cvv: !cardCvv || cardCvv.length < minCvv,
      name: !holderName.trim(),
    };
    if (Object.values(errs).some(Boolean)) {
      setCardErrors(errs);
      return;
    }
    setCardErrors({});
    setStep(4);
  }

  async function handleAddressNext() {
    const errs: { address?: boolean; city?: boolean; zip?: boolean } = {
      address: !address.trim(),
      city: !city.trim(),
      zip: !zip.trim(),
    };
    if (Object.values(errs).some(Boolean)) {
      setAddressErrors(errs);
      return;
    }
    setAddressErrors({});
    if (preselectedBotId) {
      setLoading(true);
      try {
        const res = await authFetch(`/api/v1/rail5/cards/${cardId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bot_id: preselectedBotId }),
        });
        if (!res.ok) throw new Error("Failed to link bot");
      } catch {
        toast({ title: "Warning", description: "Could not link bot to card. You can link it later from card settings.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
      setStep(6);
    } else {
      setStep(5);
    }
  }

  async function handleLimitsNext() {
    const s = Math.round(parseFloat(spendingLimit || "0") * 100);
    const d = Math.round(parseFloat(dailyLimit || "0") * 100);
    const m = Math.round(parseFloat(monthlyLimit || "0") * 100);
    const a = approveAll ? 0 : Math.round(parseFloat(approvalThreshold || "0") * 100);

    if (s < 100 || d < 100 || m < 100) {
      toast({ title: "Invalid limits", description: "Limits must be at least $1.00.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch(`/api/v1/rail5/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spending_limit_cents: s,
          daily_limit_cents: d,
          monthly_limit_cents: m,
          human_approval_above_cents: a,
        }),
      });
      if (!res.ok) throw new Error("Failed to update limits");
      setStep(3);
    } catch {
      toast({ title: "Error", description: "Failed to save spending limits.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function fetchBots() {
    setBotsLoading(true);
    try {
      const res = await authFetch("/api/v1/bots/mine");
      if (res.ok) {
        const data = await res.json();
        const loadedBots = data.bots || [];
        setBots(loadedBots);
        setBotsFetched(true);
        if (loadedBots.length === 1 && !selectedBotId) {
          setSelectedBotId(loadedBots[0].bot_id);
        }
      } else {
        setBotsFetched(true);
      }
    } catch {
      setBotsFetched(true);
    } finally {
      setBotsLoading(false);
    }
  }

  async function handleBotLink() {
    if (!selectedBotId) {
      setStep(6);
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch(`/api/v1/rail5/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_id: selectedBotId }),
      });
      if (!res.ok) throw new Error("Failed to link bot");
      setStep(6);
    } catch {
      toast({ title: "Error", description: "Failed to link bot.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function handleDone() {
    onComplete();
  }

  return {
    step, setStep,
    loading,
    cardName, setCardName,
    cardId,
    cardNumber, setCardNumber,
    cardCvv, setCardCvv,
    expMonth, setExpMonth,
    expYear, setExpYear,
    holderName, setHolderName,
    address, setAddress,
    city, setCity,
    state, setState,
    zip, setZip,
    country, setCountry,
    showCountryPicker, setShowCountryPicker,
    addressErrors, setAddressErrors,
    encryptionDone,
    downloadDone,
    keySent,
    spendingLimit, setSpendingLimit,
    dailyLimit, setDailyLimit,
    monthlyLimit, setMonthlyLimit,
    approveAll, setApproveAll,
    approvalThreshold, setApprovalThreshold,
    bots,
    selectedBotId, setSelectedBotId,
    botsLoading,
    botsFetched, setBotsFetched,
    directDeliverySucceeded,
    deliveryAttempted,
    deliveryResult,
    storedFileContent,
    cardEncrypting,
    cardEncrypted,
    savedCardDetails,
    cardErrors,
    showExitConfirm, setShowExitConfirm,
    cardLast4,
    detectedBrand,
    cardBrand,
    handleEncryptCard,
    handleRestartCard,
    handleRequestClose,
    confirmExit,
    handleStep1Next,
    handleEncryptAndDownload,
    handleCardDetailsNext,
    handleAddressNext,
    handleLimitsNext,
    handleBotLink,
    handleDone,
    preselectedBotId,
  };
}
