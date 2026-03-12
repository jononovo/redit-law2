export interface OnrampSessionResult {
  provider: "stripe";
  clientSecret: string;
  sessionId: string;
  redirectUrl: string | null;
}

export interface OnrampWebhookEvent {
  provider: "stripe";
  walletAddress: string;
  amountUsdc: number;
  sessionId: string;
  metadata?: Record<string, unknown>;
}
