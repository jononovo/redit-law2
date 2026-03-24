import type { CardData } from "./decrypt";

export interface FillResult {
  status: "filled" | "fill_failed" | "error";
  fields_filled?: string[];
  reason?: string;
  message: string;
}

interface BrowserAPI {
  snapshot(opts: { frame?: string; interactive?: boolean; compact?: boolean }): Promise<string>;
  type(ref: string, text: string): Promise<void>;
  click(ref: string): Promise<void>;
}

interface FieldMatch {
  ref: string;
  label: string;
}

const CARD_NUMBER_LABELS = [
  "card number",
  "cardnumber",
  "card-number",
  "credit card number",
  "debit card number",
];

const CVV_LABELS = [
  "cvv",
  "cvc",
  "cvv2",
  "cvc2",
  "security code",
  "card verification",
];

const KNOWN_PAYMENT_IFRAME_PATTERNS = [
  "stripe.com",
  "js.stripe.com",
  "braintreegateway.com",
  "braintree-api.com",
  "adyen.com",
  "checkout.shopify.com",
  "squareup.com",
  "square.com",
];

function findFieldRef(snapshot: string, labels: string[]): FieldMatch | null {
  const lines = snapshot.split("\n");
  for (const line of lines) {
    const lower = line.toLowerCase();
    const refMatch = line.match(/\[(?:ref=)?(e?\d+)\]/);
    if (!refMatch) continue;

    const hasInput =
      lower.includes("input") ||
      lower.includes("textbox") ||
      lower.includes("text field") ||
      lower.includes("<input");

    if (!hasInput) continue;

    for (const label of labels) {
      const idx = lower.indexOf(label);
      if (idx === -1) continue;
      const before = idx > 0 ? lower[idx - 1] : " ";
      const after = idx + label.length < lower.length ? lower[idx + label.length] : " ";
      const boundaryChars = " \t\"':;,.>]|/=-_#([{";
      if (boundaryChars.includes(before) && boundaryChars.includes(after)) {
        return { ref: refMatch[1], label };
      }
    }
  }
  return null;
}

function detectPaymentIframe(snapshot: string): string | null {
  const lower = snapshot.toLowerCase();
  for (const pattern of KNOWN_PAYMENT_IFRAME_PATTERNS) {
    if (lower.includes(pattern)) {
      return `iframe[src*='${pattern}']`;
    }
  }
  return null;
}

async function attemptFill(
  browser: BrowserAPI,
  card: CardData,
  frameHint?: string,
  attempt: number = 1
): Promise<FillResult> {
  const snapshotOpts: { frame?: string; interactive: boolean; compact: boolean } = {
    interactive: true,
    compact: true,
  };
  if (frameHint) {
    snapshotOpts.frame = frameHint;
  }

  let snap: string;
  try {
    snap = await browser.snapshot(snapshotOpts);
  } catch {
    if (frameHint && attempt === 1) {
      return attemptFill(browser, card, undefined, attempt + 1);
    }
    return {
      status: "fill_failed",
      reason: "snapshot_failed",
      message: `Could not take browser snapshot${frameHint ? ` for frame "${frameHint}"` : ""}. The page may not be ready or the frame selector may be wrong.`,
    };
  }

  const cardField = findFieldRef(snap, CARD_NUMBER_LABELS);
  const cvvField = findFieldRef(snap, CVV_LABELS);

  if (!cardField && !cvvField) {
    if (!frameHint && attempt === 1) {
      const detectedFrame = detectPaymentIframe(snap);
      if (detectedFrame) {
        return attemptFill(browser, card, detectedFrame, attempt + 1);
      }
    }
    if (frameHint && attempt <= 2) {
      return attemptFill(browser, card, undefined, attempt + 1);
    }
    return {
      status: "fill_failed",
      reason: "fields_not_found",
      message: "Could not locate card number or CVV fields in the current page snapshot.",
    };
  }

  if (!cardField) {
    return {
      status: "fill_failed",
      reason: "card_number_not_found",
      message: "Found CVV field but could not locate the card number input.",
    };
  }

  if (!cvvField) {
    return {
      status: "fill_failed",
      reason: "cvv_not_found",
      message: "Found card number field but could not locate the CVV input.",
    };
  }

  const filled: string[] = [];

  try {
    await browser.type(cardField.ref, card.number);
    filled.push("card_number");
  } catch {
    return {
      status: "fill_failed",
      fields_filled: filled,
      reason: "card_number_type_failed",
      message: "Failed to type into the card number field. The element ref may be stale or the field may not accept input.",
    };
  }

  try {
    await browser.type(cvvField.ref, card.cvv);
    filled.push("cvv");
  } catch {
    return {
      status: "fill_failed",
      fields_filled: filled,
      reason: "cvv_type_failed",
      message: "Card number was filled but failed to type into the CVV field.",
    };
  }

  return {
    status: "filled",
    fields_filled: filled,
    message: "Card number and CVV filled.",
  };
}

export async function fillCardFields(
  browser: BrowserAPI,
  card: CardData,
  frameHint?: string
): Promise<FillResult> {
  const result = await attemptFill(browser, card, frameHint, 1);

  if (result.status === "fill_failed" && result.reason !== "fields_not_found") {
    return attemptFill(browser, card, frameHint, 2);
  }

  return result;
}
