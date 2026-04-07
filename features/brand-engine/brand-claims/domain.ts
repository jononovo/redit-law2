import { FREE_EMAIL_PROVIDERS } from "./blocklist";

export function extractEmailDomain(email: string): string {
  const parts = email.split("@");
  return (parts[1] || "").toLowerCase().trim();
}

export function domainsMatch(emailDomain: string, brandDomain: string): boolean {
  const e = emailDomain.toLowerCase();
  const b = brandDomain.toLowerCase();
  if (e === b) return true;
  if (e.endsWith("." + b)) return true;
  if (b.endsWith("." + e)) return true;
  return false;
}

export function isFreeEmailProvider(emailDomain: string): boolean {
  return FREE_EMAIL_PROVIDERS.includes(emailDomain.toLowerCase());
}

export function canAutoVerifyClaim(
  email: string,
  brandDomain: string | null
): "auto_verify" | "manual_review" | "blocked" {
  const emailDomain = extractEmailDomain(email);

  if (!emailDomain) return "blocked";
  if (isFreeEmailProvider(emailDomain)) return "blocked";
  if (!brandDomain) return "manual_review";
  if (domainsMatch(emailDomain, brandDomain)) return "auto_verify";
  return "manual_review";
}
