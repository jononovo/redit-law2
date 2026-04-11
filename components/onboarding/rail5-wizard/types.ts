export interface Rail5SetupWizardContentProps {
  onComplete: () => void;
  onClose: () => void;
  preselectedBotId?: string;
  inline?: boolean;
}

export interface BotOption {
  bot_id: string;
  bot_name: string;
}

export const TOTAL_STEPS = 7;

export interface SavedCardDetails {
  cardNumber: string;
  cardExpiry: string;
  cardCvv: string;
  cardholderName: string;
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingZip: string;
}

export interface TestVerificationField {
  match: boolean;
}

export interface TestPurchaseApiResponse {
  status: "pending" | "in_progress" | "completed";
  sale_id?: string;
  completed_at?: string;
  started_at?: string;
  submitted_details?: {
    cardNumber: string;
    cardExpiry: string;
    cardCvv: string;
    cardholderName: string;
    billingAddress: string;
    billingCity: string;
    billingState: string;
    billingZip: string;
  };
}

export interface TestPurchaseResult {
  status: "pending" | "in_progress" | "completed";
  sale_id?: string;
  verified?: boolean;
  fields?: Record<string, TestVerificationField>;
}

export interface Step7Props {
  cardId: string;
  cardName: string;
  cardLast4: string;
  spendingLimit: string;
  dailyLimit: string;
  monthlyLimit: string;
  selectedBotId: string;
  bots: BotOption[];
  directDeliverySucceeded: boolean;
  deliveryResult: { delivered: boolean; method: string; messageId?: number; expiresAt?: string } | null;
  storedFileContent: string;
  onNext: () => void;
  onDone: () => void;
}

export interface Step8Props {
  cardId: string;
  cardName: string;
  cardLast4: string;
  savedCardDetails: SavedCardDetails | null;
  onDone: () => void;
}

export const FIELD_LABELS: Record<string, string> = {
  card_number: "Card Number",
  card_expiry: "Expiry",
  card_cvv: "CVV",
  cardholder_name: "Cardholder Name",
  billing_address: "Address",
  billing_city: "City",
  billing_state: "State",
  billing_zip: "ZIP Code",
};
