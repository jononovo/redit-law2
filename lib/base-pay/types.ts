export interface BasePayVerifyInput {
  txId: string;
  expectedAmount?: string;
  expectedRecipient: string;
}

export interface BasePayVerifyResult {
  status: string;
  sender: string;
  amount: string;
  recipient: string;
}

export interface BasePayCheckoutInput {
  txId: string;
  checkoutPageId: string;
  buyerEmail?: string;
  buyerName?: string;
  buyerIp?: string;
  buyerUserAgent?: string;
  invoiceRef?: string;
}
