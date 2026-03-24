export type PaymentMethod =
  | "card"
  | "mpp"
  | "x402"
  | "ach"
  | "wire"
  | "invoice"
  | "crypto"
  | "apple_pay"
  | "google_pay"
  | "klarna"
  | "afterpay";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  card: "Credit/Debit Card",
  mpp: "Mobile Payment",
  x402: "x402 Protocol",
  ach: "ACH Transfer",
  wire: "Wire Transfer",
  invoice: "Invoice / Net Terms",
  crypto: "Cryptocurrency",
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  klarna: "Klarna",
  afterpay: "Afterpay",
};
