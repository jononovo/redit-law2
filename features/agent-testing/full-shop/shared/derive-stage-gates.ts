import type {
  FullShopFieldEvent,
  FullShopScenarioConfig,
  DerivedStageGate,
  FieldMatchResult,
  CorrectionDetail,
} from "./types";
import { FULL_SHOP_STAGES, EVENT_TYPES } from "./constants";

const DECISION_EVENT_MAP: Record<string, { eventType: string; fieldName?: string }[]> = {
  search: [{ eventType: EVENT_TYPES.SEARCH_SUBMIT }],
  product_select: [{ eventType: EVENT_TYPES.PRODUCT_CLICK }],
  variant_config: [
    { eventType: EVENT_TYPES.COLOR_SELECT },
    { eventType: EVENT_TYPES.SIZE_SELECT },
    { eventType: EVENT_TYPES.QUANTITY_INCREMENT },
    { eventType: EVENT_TYPES.QUANTITY_DECREMENT },
    { eventType: EVENT_TYPES.QUANTITY_INPUT },
  ],
  checkout_options: [
    { eventType: EVENT_TYPES.ADDRESS_FIELD_BLUR, fieldName: "fullName" },
    { eventType: EVENT_TYPES.ADDRESS_FIELD_BLUR, fieldName: "street" },
    { eventType: EVENT_TYPES.ADDRESS_FIELD_BLUR, fieldName: "city" },
    { eventType: EVENT_TYPES.ADDRESS_FIELD_BLUR, fieldName: "state" },
    { eventType: EVENT_TYPES.ADDRESS_FIELD_BLUR, fieldName: "zip" },
    { eventType: EVENT_TYPES.SHIPPING_METHOD_SELECT },
    { eventType: EVENT_TYPES.PAYMENT_METHOD_SELECT },
  ],
  payment: [
    { eventType: EVENT_TYPES.CARD_FIELD_BLUR, fieldName: "cardholderName" },
    { eventType: EVENT_TYPES.CARD_FIELD_BLUR, fieldName: "cardNumber" },
    { eventType: EVENT_TYPES.CARD_FIELD_SELECT, fieldName: "expiryMonth" },
    { eventType: EVENT_TYPES.CARD_FIELD_SELECT, fieldName: "expiryYear" },
    { eventType: EVENT_TYPES.CARD_FIELD_BLUR, fieldName: "cvv" },
    { eventType: EVENT_TYPES.CARD_FIELD_BLUR, fieldName: "billingZip" },
    { eventType: EVENT_TYPES.TERMS_CHECK },
  ],
};

function getExpectedValuesForStage(
  stage: string,
  scenario: FullShopScenarioConfig
): Record<string, string> {
  switch (stage) {
    case "search":
      return { searchQuery: scenario.expectedSearchTerm };
    case "product_select":
      return { product: scenario.expectedProductSlug };
    case "variant_config":
      return {
        color: scenario.expectedColor,
        size: scenario.expectedSize,
        quantity: String(scenario.expectedQuantity),
      };
    case "checkout_options":
      return {
        fullName: scenario.expectedShippingAddress.fullName,
        street: scenario.expectedShippingAddress.street,
        city: scenario.expectedShippingAddress.city,
        state: scenario.expectedShippingAddress.state,
        zip: scenario.expectedShippingAddress.zip,
        shippingMethod: scenario.expectedShippingMethod,
        paymentMethod: scenario.expectedPaymentMethod,
      };
    case "payment":
      return {
        cardholderName: scenario.expectedCardDetails.cardholderName,
        cardNumber: scenario.expectedCardDetails.cardNumber,
        expiryMonth: scenario.expectedCardDetails.cardExpiry.split("/")[0],
        expiryYear: scenario.expectedCardDetails.cardExpiry.split("/")[1],
        cvv: scenario.expectedCardDetails.cardCvv,
        billingZip: scenario.expectedCardDetails.billingZip,
        termsChecked: "true",
      };
    default:
      return {};
  }
}

function normalizeForComparison(value: string): string {
  return value.replace(/[\s\-]/g, "").toLowerCase().trim();
}

function valuesMatch(expected: string, actual: string, field?: string): boolean {
  if (field === "cardNumber") {
    const expDigits = expected.replace(/\D/g, "");
    const actDigits = actual.replace(/\D/g, "");
    return expDigits === actDigits;
  }
  return normalizeForComparison(expected) === normalizeForComparison(actual);
}

function extractFinalValueForField(
  events: FullShopFieldEvent[],
  field: string,
  stage: string
): string | null {
  const stageEvents = events.filter((e) => e.stage === stage);

  switch (field) {
    case "searchQuery": {
      const submits = stageEvents.filter((e) => e.event_type === EVENT_TYPES.SEARCH_SUBMIT);
      return submits.length > 0 ? submits[submits.length - 1].value_snapshot : null;
    }
    case "product": {
      const clicks = stageEvents.filter((e) => e.event_type === EVENT_TYPES.PRODUCT_CLICK);
      return clicks.length > 0 ? clicks[clicks.length - 1].value_snapshot : null;
    }
    case "color": {
      const selects = stageEvents.filter((e) => e.event_type === EVENT_TYPES.COLOR_SELECT);
      return selects.length > 0 ? selects[selects.length - 1].value_snapshot : null;
    }
    case "size": {
      const selects = stageEvents.filter((e) => e.event_type === EVENT_TYPES.SIZE_SELECT);
      return selects.length > 0 ? selects[selects.length - 1].value_snapshot : null;
    }
    case "quantity": {
      const qtyEvents = stageEvents.filter(
        (e) =>
          e.event_type === EVENT_TYPES.QUANTITY_INCREMENT ||
          e.event_type === EVENT_TYPES.QUANTITY_DECREMENT ||
          e.event_type === EVENT_TYPES.QUANTITY_INPUT
      );
      return qtyEvents.length > 0 ? qtyEvents[qtyEvents.length - 1].value_snapshot : null;
    }
    case "shippingMethod": {
      const selects = stageEvents.filter(
        (e) => e.event_type === EVENT_TYPES.SHIPPING_METHOD_SELECT
      );
      return selects.length > 0 ? selects[selects.length - 1].value_snapshot : null;
    }
    case "paymentMethod": {
      const selects = stageEvents.filter(
        (e) => e.event_type === EVENT_TYPES.PAYMENT_METHOD_SELECT
      );
      return selects.length > 0 ? selects[selects.length - 1].value_snapshot : null;
    }
    case "termsChecked": {
      const checks = stageEvents.filter(
        (e) =>
          e.event_type === EVENT_TYPES.TERMS_CHECK ||
          e.event_type === EVENT_TYPES.TERMS_UNCHECK
      );
      if (checks.length === 0) return null;
      return checks[checks.length - 1].event_type === EVENT_TYPES.TERMS_CHECK
        ? "true"
        : "false";
    }
    default: {
      const blurEvents = stageEvents.filter(
        (e) =>
          (e.event_type === EVENT_TYPES.ADDRESS_FIELD_BLUR ||
            e.event_type === EVENT_TYPES.CARD_FIELD_BLUR ||
            e.event_type === EVENT_TYPES.CARD_FIELD_SELECT) &&
          e.field_name === field
      );
      if (blurEvents.length > 0) {
        return blurEvents[blurEvents.length - 1].value_snapshot;
      }
      const inputEvents = stageEvents.filter(
        (e) =>
          (e.event_type === EVENT_TYPES.ADDRESS_FIELD_INPUT ||
            e.event_type === EVENT_TYPES.CARD_FIELD_INPUT) &&
          e.field_name === field
      );
      return inputEvents.length > 0
        ? inputEvents[inputEvents.length - 1].value_snapshot
        : null;
    }
  }
}

function countCorrections(
  events: FullShopFieldEvent[],
  field: string,
  stage: string
): CorrectionDetail | null {
  const stageEvents = events.filter((e) => e.stage === stage);
  let relevantEvents: FullShopFieldEvent[];

  switch (field) {
    case "color":
      relevantEvents = stageEvents.filter((e) => e.event_type === EVENT_TYPES.COLOR_SELECT);
      break;
    case "size":
      relevantEvents = stageEvents.filter((e) => e.event_type === EVENT_TYPES.SIZE_SELECT);
      break;
    case "product":
      relevantEvents = stageEvents.filter(
        (e) => e.event_type === EVENT_TYPES.PRODUCT_CLICK
      );
      break;
    case "shippingMethod":
      relevantEvents = stageEvents.filter(
        (e) => e.event_type === EVENT_TYPES.SHIPPING_METHOD_SELECT
      );
      break;
    case "paymentMethod":
      relevantEvents = stageEvents.filter(
        (e) => e.event_type === EVENT_TYPES.PAYMENT_METHOD_SELECT
      );
      break;
    default:
      return null;
  }

  if (relevantEvents.length <= 1) return null;

  const firstSnap = relevantEvents[0].value_snapshot ?? "";
  const lastSnap = relevantEvents[relevantEvents.length - 1].value_snapshot ?? "";

  return {
    field,
    firstAttempt: firstSnap,
    finalValue: lastSnap,
    attempts: relevantEvents.length,
  };
}

export function deriveStageGatesFromEventLog(
  events: FullShopFieldEvent[],
  scenario: FullShopScenarioConfig
): DerivedStageGate[] {
  return FULL_SHOP_STAGES.map((stage, idx) => {
    const stageEvents = events.filter((e) => e.stage === stage);
    const expectedValues = getExpectedValuesForStage(stage, scenario);
    const finalValues: Record<string, string> = {};
    const fieldMatches: Record<string, FieldMatchResult> = {};
    const correctionDetails: CorrectionDetail[] = [];

    for (const field of Object.keys(expectedValues)) {
      const actual = extractFinalValueForField(events, field, stage);
      finalValues[field] = actual ?? "";
      fieldMatches[field] = {
        expected: expectedValues[field],
        actual: actual ?? "",
        match: actual !== null && valuesMatch(expectedValues[field], actual, field),
      };

      const correction = countCorrections(events, field, stage);
      if (correction) {
        correctionDetails.push(correction);
      }
    }

    const timestamps = stageEvents.map((e) => new Date(e.event_timestamp).getTime());
    const startedAt =
      timestamps.length > 0 ? new Date(Math.min(...timestamps)).toISOString() : null;
    const completedAt =
      timestamps.length > 0 ? new Date(Math.max(...timestamps)).toISOString() : null;
    const durationMs =
      timestamps.length > 1 ? Math.max(...timestamps) - Math.min(...timestamps) : 0;

    const hasExpectedFields = Object.keys(expectedValues).length > 0;
    const stagePassed = hasExpectedFields
      ? Object.values(fieldMatches).every((m) => m.match)
      : stageEvents.length > 0;

    return {
      stage,
      stageNumber: idx,
      startedAt,
      completedAt,
      durationMs,
      finalValues,
      expectedValues,
      fieldMatches,
      stagePassed,
      corrections: correctionDetails.reduce((sum, c) => sum + (c.attempts - 1), 0),
      correctionDetails,
      eventCount: stageEvents.length,
    };
  });
}
