const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkPairingCodeRateLimit(
  bucket: string,
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const mapKey = `${bucket}:${key}`;
  const now = Date.now();
  const entry = rateLimitMap.get(mapKey);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(mapKey, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}
