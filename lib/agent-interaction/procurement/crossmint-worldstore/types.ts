export interface CrossMintOrderEvent {
  type: string;
  payload?: {
    orderIdentifier?: string;
    orderId?: string;
    lineItems?: Array<{
      delivery?: {
        carrier?: string;
        trackingNumber?: string;
        trackingUrl?: string;
        estimatedDelivery?: string;
        txId?: string;
      };
    }>;
    [key: string]: unknown;
  };
  orderIdentifier?: string;
  orderId?: string;
  [key: string]: unknown;
}

export interface OrderStatusMapping {
  orderStatus: string;
  status?: string;
}

export interface TrackingInfo {
  carrier?: string;
  tracking_number?: string;
  tracking_url?: string;
  estimated_delivery?: string;
}

export interface ProductVariant {
  variant_id: string;
  title: string;
  price: number | null;
  currency: string;
  available: boolean;
  options: Record<string, unknown>;
}

export interface ProductSearchResult {
  product_url: string;
  product_name: string | null;
  variants: ProductVariant[];
  warning?: string;
  locator_format?: string;
}
