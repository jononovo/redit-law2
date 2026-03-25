"use client";

import { type Rail5SetupWizardContentProps } from "./types";
import { useRail5Wizard } from "./use-rail5-wizard";
import { WizardShell } from "./wizard-shell";
import { NameCard } from "./steps/name-card";
import { HowItWorks } from "./steps/how-it-works";
import { SpendingLimits } from "./steps/spending-limits";
import { CardEntry } from "./steps/card-entry";
import { BillingAddress } from "./steps/billing-address";
import { LinkBot } from "./steps/link-bot";
import { EncryptDeliver } from "./steps/encrypt-deliver";
import { DeliveryResult } from "./steps/delivery-result";
import { TestVerification } from "./steps/test-verification";

export function Rail5SetupWizardContent({ onComplete, onClose, preselectedBotId, inline = false }: Rail5SetupWizardContentProps) {
  const w = useRail5Wizard({ onComplete, onClose, preselectedBotId });

  return (
    <WizardShell
      inline={inline}
      step={w.step}
      showExitConfirm={w.showExitConfirm}
      onRequestClose={w.handleRequestClose}
      onConfirmExit={w.confirmExit}
      onDismissExit={() => w.setShowExitConfirm(false)}
    >
      {w.step === 0 && (
        <NameCard
          cardName={w.cardName}
          setCardName={w.setCardName}
          loading={w.loading}
          onNext={w.handleStep1Next}
        />
      )}

      {w.step === 1 && (
        <HowItWorks
          onBack={() => w.setStep(0)}
          onNext={() => w.setStep(2)}
        />
      )}

      {w.step === 2 && (
        <SpendingLimits
          spendingLimit={w.spendingLimit}
          setSpendingLimit={w.setSpendingLimit}
          dailyLimit={w.dailyLimit}
          setDailyLimit={w.setDailyLimit}
          monthlyLimit={w.monthlyLimit}
          setMonthlyLimit={w.setMonthlyLimit}
          approveAll={w.approveAll}
          setApproveAll={w.setApproveAll}
          approvalThreshold={w.approvalThreshold}
          setApprovalThreshold={w.setApprovalThreshold}
          loading={w.loading}
          onBack={() => w.setStep(1)}
          onNext={w.handleLimitsNext}
        />
      )}

      {w.step === 3 && (
        <CardEntry
          cardNumber={w.cardNumber}
          setCardNumber={w.setCardNumber}
          expMonth={w.expMonth}
          setExpMonth={w.setExpMonth}
          expYear={w.expYear}
          setExpYear={w.setExpYear}
          cardCvv={w.cardCvv}
          setCardCvv={w.setCardCvv}
          holderName={w.holderName}
          setHolderName={w.setHolderName}
          cardErrors={w.cardErrors}
          cardEncrypting={w.cardEncrypting}
          cardEncrypted={w.cardEncrypted}
          detectedBrand={w.detectedBrand}
          onEncryptCard={w.handleEncryptCard}
          onRestartCard={w.handleRestartCard}
          onCardDetailsNext={w.handleCardDetailsNext}
          onBack={() => w.setStep(2)}
        />
      )}

      {w.step === 4 && (
        <BillingAddress
          address={w.address}
          setAddress={w.setAddress}
          city={w.city}
          setCity={w.setCity}
          state={w.state}
          setState={w.setState}
          zip={w.zip}
          setZip={w.setZip}
          country={w.country}
          setCountry={w.setCountry}
          showCountryPicker={w.showCountryPicker}
          setShowCountryPicker={w.setShowCountryPicker}
          addressErrors={w.addressErrors}
          setAddressErrors={w.setAddressErrors}
          onBack={() => w.setStep(3)}
          onNext={w.handleAddressNext}
        />
      )}

      {w.step === 5 && (
        <LinkBot
          bots={w.bots}
          selectedBotId={w.selectedBotId}
          setSelectedBotId={w.setSelectedBotId}
          botsLoading={w.botsLoading}
          botsFetched={w.botsFetched}
          setBotsFetched={w.setBotsFetched}
          loading={w.loading}
          onSkip={() => { w.setSelectedBotId(""); w.setStep(6); }}
          onLink={w.handleBotLink}
        />
      )}

      {w.step === 6 && (
        <EncryptDeliver
          selectedBotId={w.selectedBotId}
          encryptionDone={w.encryptionDone}
          keySent={w.keySent}
          downloadDone={w.downloadDone}
          directDeliverySucceeded={w.directDeliverySucceeded}
          deliveryAttempted={w.deliveryAttempted}
          loading={w.loading}
          preselectedBotId={w.preselectedBotId}
          onBack={() => w.setStep(w.preselectedBotId ? 4 : 5)}
          onEncrypt={w.handleEncryptAndDownload}
        />
      )}

      {w.step === 7 && (
        <DeliveryResult
          cardId={w.cardId}
          cardName={w.cardName}
          cardLast4={w.cardLast4}
          spendingLimit={w.spendingLimit}
          dailyLimit={w.dailyLimit}
          monthlyLimit={w.monthlyLimit}
          selectedBotId={w.selectedBotId}
          bots={w.bots}
          directDeliverySucceeded={w.directDeliverySucceeded}
          deliveryResult={w.deliveryResult}
          storedFileContent={w.storedFileContent}
          storedCompanionContent={w.storedCompanionContent}
          onNext={() => w.savedCardDetails ? w.setStep(8) : w.handleDone()}
          onDone={w.handleDone}
        />
      )}

      {w.step === 8 && (
        <TestVerification
          cardId={w.cardId}
          cardName={w.cardName}
          cardLast4={w.cardLast4}
          savedCardDetails={w.savedCardDetails}
          onDone={w.handleDone}
        />
      )}
    </WizardShell>
  );
}
