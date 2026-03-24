export type CheckoutProvider =
  | "stripe"
  | "adyen"
  | "shopify"
  | "worldpay"
  | "paypal"
  | "in_house"
  | "other";

export const CHECKOUT_PROVIDER_LABELS: Record<CheckoutProvider, string> = {
  stripe: "Stripe",
  adyen: "Adyen",
  shopify: "Shopify Payments",
  worldpay: "Worldpay",
  paypal: "PayPal",
  in_house: "In-House",
  other: "Other",
};
