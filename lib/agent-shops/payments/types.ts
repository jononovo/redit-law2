export interface PaymentContext {
  mode: "topup" | "checkout";
  rail: "rail1" | "rail2";
  amountUsd: number;
  walletAddress: string;

  walletId?: number;
  botName?: string;

  checkoutPageId?: string;
  invoiceRef?: string;
  buyerEmail?: string;
  buyerName?: string;
  testToken?: string;
}

export interface PaymentResult {
  method: string;
  status: "completed" | "failed";
  transactionId?: number;
  saleId?: string;
  newBalanceUsd?: number;
  error?: string;
}

export interface PaymentHandlerProps {
  context: PaymentContext;
  onSuccess: (result: PaymentResult) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

export interface PaymentMethodDef {
  id: string;
  label: string;
  subtitle: string;
  iconEmoji: string;
  supportedRails: ("rail1" | "rail2")[];
  supportedModes: ("topup" | "checkout")[];
  minAmount?: number;
}
