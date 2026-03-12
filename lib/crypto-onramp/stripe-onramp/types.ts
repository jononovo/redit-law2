export interface StripeOnrampSessionPayload {
  id: string;
  status: string;
  client_secret: string;
  redirect_url?: string;
  transaction_details?: {
    wallet_addresses?: {
      ethereum?: string;
    };
    destination_amount?: string;
    source_currency?: string;
    source_amount?: string;
  };
}
