export type VendorCapability =
  | "price_lookup"
  | "stock_check"
  | "programmatic_checkout"
  | "business_invoicing"
  | "bulk_pricing"
  | "tax_exemption"
  | "account_creation"
  | "order_tracking"
  | "returns"
  | "po_numbers";

export const CAPABILITY_LABELS: Record<VendorCapability, string> = {
  price_lookup: "Price Lookup",
  stock_check: "Stock Check",
  programmatic_checkout: "Programmatic Checkout",
  business_invoicing: "Business Invoicing",
  bulk_pricing: "Bulk Pricing",
  tax_exemption: "Tax Exemption",
  account_creation: "Account Creation",
  order_tracking: "Order Tracking",
  returns: "Returns",
  po_numbers: "PO Numbers",
};
