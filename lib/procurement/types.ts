export type ProcurementProvider = "crossmint-worldstore";

export interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface PurchaseRequest {
  provider: ProcurementProvider;
  merchant: string;
  productId: string;
  walletAddress: string;
  ownerEmail: string;
  shippingAddress: ShippingAddress;
  quantity?: number;
}

export interface PurchaseResult {
  orderId: string;
  order: Record<string, unknown>;
  pricing?: {
    subtotalCents?: number;
    shippingCents?: number;
    taxCents?: number;
    totalCents?: number;
  };
}

export interface OrderStatusResult {
  orderId: string;
  status: string;
  data: Record<string, unknown>;
}
