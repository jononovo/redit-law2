export interface QrPayCreateInput {
  ownerUid: string;
  walletAddress: string;
  amountUsdc: number;
}

export interface QrPayCreateResult {
  paymentId: string;
  eip681Uri: string;
  walletAddress: string;
  amountUsdc: number;
  expiresAt: Date;
}

export interface QrPayStatusResult {
  status: "waiting" | "confirmed" | "expired";
  creditedUsdc?: number;
  newBalanceUsd?: number;
  transactionId?: number;
}
