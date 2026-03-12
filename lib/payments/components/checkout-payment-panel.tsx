"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getAvailableMethods } from "../methods";
import { PaymentMethodSelector } from "./payment-method-selector";
import { StripeOnrampHandler } from "../handlers/stripe-onramp-handler";
import { BasePayHandler } from "../handlers/base-pay-handler";
import { TestingHandler } from "../handlers/testing-handler";
import { X402Handler } from "../handlers/x402-handler";
import type { PaymentContext, PaymentResult, PaymentMethodDef } from "../types";

type PanelState = "select" | "paying" | "error";

interface CheckoutPaymentPanelProps {
  checkoutPageId: string;
  walletAddress: string;
  effectiveAmount: number | null;
  displayAmount: string | null;
  invoiceRef?: string;
  collectBuyerName: boolean;
  allowedMethods: string[];
  pageType: "product" | "event" | "digital_product";
  buyerCount: number | null;
  testToken?: string;
  onSuccess: (result: PaymentResult) => void;
}

export function CheckoutPaymentPanel({
  checkoutPageId,
  walletAddress,
  effectiveAmount,
  displayAmount,
  invoiceRef,
  collectBuyerName,
  allowedMethods,
  pageType,
  buyerCount,
  testToken,
  onSuccess,
}: CheckoutPaymentPanelProps) {
  const [panelState, setPanelState] = useState<PanelState>("select");
  const [activeMethod, setActiveMethod] = useState<string | null>(null);
  const { toast } = useToast();
  const [customAmount, setCustomAmount] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const methods = getAvailableMethods("rail1", "checkout", allowedMethods);

  const resolvedAmount = effectiveAmount ?? (customAmount ? parseFloat(customAmount) : null);

  const isAmountValid = resolvedAmount !== null && resolvedAmount >= 0.10 && resolvedAmount <= 10000;

  const disabledMethods = methods
    .filter((m) => m.minAmount !== undefined && resolvedAmount !== null && resolvedAmount < m.minAmount)
    .map((m) => m.id);

  const autoSelect = methods.length === 1;

  const handleMethodSelect = useCallback((methodId: string) => {
    if (!isAmountValid) {
      toast({
        title: "Invalid amount",
        description: "Please enter an amount between $0.10 and $10,000",
        variant: "destructive",
      });
      return;
    }
    const method = methods.find((m) => m.id === methodId);
    if (method?.minAmount && resolvedAmount !== null && resolvedAmount < method.minAmount) {
      toast({
        title: "Minimum not met",
        description: `${method.label} requires at least $${method.minAmount.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }
    setActiveMethod(methodId);
    setPanelState("paying");
  }, [isAmountValid, methods, resolvedAmount, toast]);

  const buildContext = useCallback((): PaymentContext => ({
    mode: "checkout",
    rail: "rail1",
    amountUsd: resolvedAmount!,
    walletAddress,
    checkoutPageId,
    invoiceRef,
    buyerName: buyerName.trim() || undefined,
    testToken,
  }), [resolvedAmount, walletAddress, checkoutPageId, invoiceRef, buyerName, testToken]);

  const handlePaymentSuccess = useCallback((result: PaymentResult) => {
    onSuccess(result);
  }, [onSuccess]);

  const handlePaymentError = useCallback((error: string) => {
    setErrorMessage(error);
    setPanelState("error");
    setActiveMethod(null);
  }, []);

  const handlePaymentCancel = useCallback(() => {
    setPanelState("select");
    setActiveMethod(null);
  }, []);

  const renderHandler = () => {
    if (!activeMethod) return null;
    const ctx = buildContext();

    switch (activeMethod) {
      case "stripe_onramp":
        return (
          <StripeOnrampHandler
            context={ctx}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            onCancel={handlePaymentCancel}
          />
        );
      case "base_pay":
        return (
          <BasePayHandler
            context={ctx}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            onCancel={handlePaymentCancel}
          />
        );
      case "testing":
        return (
          <TestingHandler
            context={ctx}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            onCancel={handlePaymentCancel}
          />
        );
      case "x402":
        return (
          <X402Handler
            context={ctx}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            onCancel={handlePaymentCancel}
          />
        );
      default:
        return null;
    }
  };

  if (panelState === "paying") {
    return (
      <div className="w-full" data-testid="checkout-payment-active">
        {renderHandler()}
      </div>
    );
  }

  if (panelState === "error") {
    return (
      <div className="w-full max-w-sm mx-auto" data-testid="checkout-payment-error">
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-lg font-semibold text-neutral-900">Payment failed</p>
          <p className="text-sm text-neutral-500">{errorMessage}</p>
          <button
            onClick={() => {
              setPanelState("select");
              setErrorMessage("");
            }}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
            data-testid="button-retry-payment"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto" data-testid="checkout-payment-panel">
      <h2 className="text-xl font-bold text-neutral-900 mb-6" data-testid="text-payment-heading">
        {invoiceRef ? `Pay Invoice ${invoiceRef}` : "Payment Details"}
      </h2>

      <div className="space-y-6">
        {!displayAmount && (
          <div>
            <label className="text-sm font-semibold text-neutral-700 mb-2 block">Amount</label>
            <div className="relative" data-testid="input-custom-amount-wrapper">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-neutral-400">$</span>
              <Input
                type="number"
                min="0.10"
                max="10000"
                step="0.01"
                placeholder="0.00"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="pl-8 text-2xl font-bold h-14 rounded-xl"
                data-testid="input-custom-amount"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-neutral-400 font-medium">USD</span>
            </div>
          </div>
        )}

        {displayAmount && (
          <div className="bg-neutral-50 rounded-xl px-4 py-3 border border-neutral-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-500">Total</span>
              <span className="text-2xl font-bold text-neutral-900" data-testid="text-payment-total">${displayAmount} USD</span>
            </div>
          </div>
        )}

        {collectBuyerName && (
          <div>
            <label className="text-sm font-semibold text-neutral-700 mb-2 block">Your Name</label>
            <Input
              type="text"
              placeholder="Enter your name"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              className="rounded-xl"
              data-testid="input-buyer-name"
            />
          </div>
        )}

        {autoSelect ? (
          <SingleMethodButton
            method={methods[0]}
            disabled={!isAmountValid || disabledMethods.includes(methods[0].id)}
            onSelect={handleMethodSelect}
          />
        ) : (
          <PaymentMethodSelector
            methods={methods}
            onSelect={handleMethodSelect}
            disabled={!isAmountValid}
            disabledMethods={disabledMethods}
          />
        )}

        {pageType === "event" && buyerCount !== null && buyerCount > 0 && (
          <div className="flex items-center justify-center gap-1.5 text-sm text-neutral-400" data-testid="text-event-buyer-count">
            <span>{buyerCount} {buyerCount === 1 ? "person" : "people"} bought this</span>
          </div>
        )}

        <p className="text-center text-xs text-neutral-400 font-medium">
          Secure payment powered by Stripe &amp; Base
        </p>
      </div>
    </div>
  );
}

function SingleMethodButton({
  method,
  disabled,
  onSelect,
}: {
  method: PaymentMethodDef;
  disabled: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(method.id)}
      disabled={disabled}
      className={`
        w-full h-12 flex items-center justify-center gap-2 text-base font-bold rounded-xl transition-all cursor-pointer
        bg-neutral-900 text-white hover:bg-neutral-800
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
      data-testid="button-pay"
    >
      <span>{method.iconEmoji}</span>
      Pay with {method.label}
    </button>
  );
}
