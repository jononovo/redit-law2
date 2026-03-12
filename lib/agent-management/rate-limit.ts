const buckets = new Map<string, { tokens: number; lastRefill: number }>();

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const BOT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  "/api/v1/bot/wallet/check": { maxRequests: 6, windowMs: 60 * 60 * 1000 },
  "/api/v1/bot/wallet/spending": { maxRequests: 6, windowMs: 60 * 60 * 1000 },
  "/api/v1/bot/wallet/topup-request": { maxRequests: 3, windowMs: 60 * 60 * 1000 },
  "/api/v1/bot/wallet/transactions": { maxRequests: 12, windowMs: 60 * 60 * 1000 },
  "/api/v1/bot/payments/create-link": { maxRequests: 10, windowMs: 60 * 60 * 1000 },
  "/api/v1/bot/payments/links": { maxRequests: 12, windowMs: 60 * 60 * 1000 },
  "/api/v1/bot/merchant/checkout": { maxRequests: 30, windowMs: 60 * 60 * 1000 },
  "/api/v1/bot/merchant/checkout/status": { maxRequests: 60, windowMs: 60 * 60 * 1000 },
  "/api/v1/bot/tasks/next": { maxRequests: 12, windowMs: 60 * 60 * 1000 },
  "/api/v1/bot/rail5/checkout": { maxRequests: 30, windowMs: 60 * 60 * 1000 },
  "/api/v1/bot/rail5/key": { maxRequests: 30, windowMs: 60 * 60 * 1000 },
  "/api/v1/bot/rail5/confirm": { maxRequests: 30, windowMs: 60 * 60 * 1000 },
  "/api/v1/bot/rail5/checkout/status": { maxRequests: 60, windowMs: 60 * 60 * 1000 },
  "/api/v1/bot/status": { maxRequests: 6, windowMs: 60 * 60 * 1000 },
  "/api/v1/bot/check/rail1": { maxRequests: 6, windowMs: 60 * 60 * 1000 },
  "/api/v1/bot/check/rail2": { maxRequests: 6, windowMs: 60 * 60 * 1000 },
  "/api/v1/bot/check/rail4": { maxRequests: 6, windowMs: 60 * 60 * 1000 },
  "/api/v1/bot/check/rail5": { maxRequests: 6, windowMs: 60 * 60 * 1000 },
  "/api/v1/bot/check/rail4/test": { maxRequests: 12, windowMs: 60 * 60 * 1000 },
  "/api/v1/bot/invoices/create": { maxRequests: 10, windowMs: 60 * 60 * 1000 },
  "/api/v1/bot/invoices": { maxRequests: 12, windowMs: 60 * 60 * 1000 },
  "/api/v1/bot/invoices/send": { maxRequests: 5, windowMs: 60 * 60 * 1000 },
};

export function checkBotRateLimit(botId: string, endpoint: string): { allowed: boolean; retryAfterSeconds?: number } {
  const config = BOT_RATE_LIMITS[endpoint];
  if (!config) return { allowed: true };

  const key = `${botId}:${endpoint}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.lastRefill + config.windowMs) {
    buckets.set(key, { tokens: config.maxRequests - 1, lastRefill: now });
    return { allowed: true };
  }

  if (bucket.tokens <= 0) {
    const retryAfterSeconds = Math.ceil((bucket.lastRefill + config.windowMs - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  bucket.tokens--;
  return { allowed: true };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    const endpoint = key.split(":").slice(1).join(":");
    const config = BOT_RATE_LIMITS[endpoint];
    if (config && now > bucket.lastRefill + config.windowMs) {
      buckets.delete(key);
    }
  }
}, 5 * 60 * 1000);
