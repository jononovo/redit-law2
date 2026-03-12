export type CardBrand = "visa" | "mastercard" | "amex" | "discover" | "jcb" | "diners" | "unknown";

export function detectCardBrand(number: string): CardBrand {
  const n = number.replace(/\s/g, "");
  if (!n) return "unknown";

  if (n.startsWith("4")) return "visa";

  const two = parseInt(n.slice(0, 2), 10);
  const four = parseInt(n.slice(0, 4), 10);

  if ((two >= 51 && two <= 55) || (four >= 2221 && four <= 2720)) return "mastercard";

  if (n.startsWith("34") || n.startsWith("37")) return "amex";

  if (
    n.startsWith("6011") ||
    n.startsWith("65") ||
    (two >= 64 && two <= 65) ||
    (parseInt(n.slice(0, 3), 10) >= 644 && parseInt(n.slice(0, 3), 10) <= 649)
  ) return "discover";

  if (n.startsWith("35")) return "jcb";

  if (n.startsWith("30") || n.startsWith("36") || n.startsWith("38")) return "diners";

  return "unknown";
}

export const BRAND_DISPLAY_NAMES: Record<CardBrand, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  jcb: "JCB",
  diners: "Diners Club",
  unknown: "Card",
};

export function getMaxDigits(brand: CardBrand): number {
  switch (brand) {
    case "amex": return 15;
    case "diners": return 14;
    default: return 16;
  }
}

export function formatCardNumber(digits: string, brand: CardBrand): string {
  const clean = digits.replace(/\D/g, "");
  switch (brand) {
    case "amex":
      return [clean.slice(0, 4), clean.slice(4, 10), clean.slice(10, 15)].filter(Boolean).join(" ");
    case "diners":
      return [clean.slice(0, 4), clean.slice(4, 10), clean.slice(10, 14)].filter(Boolean).join(" ");
    default:
      return [clean.slice(0, 4), clean.slice(4, 8), clean.slice(8, 12), clean.slice(12, 16)].filter(Boolean).join(" ");
  }
}

export function getCardPlaceholder(brand: CardBrand): string {
  switch (brand) {
    case "amex": return "0000 000000 00000";
    case "diners": return "0000 000000 0000";
    default: return "0000 0000 0000 0000";
  }
}

export type ApiBrand = "visa" | "mastercard" | "amex" | "discover" | "jcb" | "diners";

export function brandToApiValue(brand: CardBrand): ApiBrand {
  if (brand === "unknown") return "visa";
  return brand;
}
