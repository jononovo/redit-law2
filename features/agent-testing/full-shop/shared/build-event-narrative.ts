import type {
  FullShopFieldEvent,
  FullShopScenarioConfig,
  EventNarrative,
} from "./types";
import { EVENT_TYPES } from "./constants";

function formatRelativeTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = ms % 1000;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

function describeEvent(
  event: FullShopFieldEvent,
  scenario: FullShopScenarioConfig
): { description: string; is_mistake: boolean; is_correction: boolean } {
  const snap = event.value_snapshot;
  let description = "";
  let is_mistake = false;
  let is_correction = false;

  switch (event.event_type) {
    case EVENT_TYPES.SHOP_LANDING:
      description = "Arrived at the shop homepage";
      break;
    case EVENT_TYPES.PAGE_NAVIGATE:
      description = `Navigated to ${snap}`;
      break;
    case EVENT_TYPES.PAGE_BACK:
      description = "Navigated back";
      is_correction = true;
      break;
    case EVENT_TYPES.SEARCH_FOCUS:
      description = "Focused the search bar";
      break;
    case EVENT_TYPES.SEARCH_INPUT:
      description = `Typing in search: "${snap}"`;
      break;
    case EVENT_TYPES.SEARCH_CLEAR:
      description = "Cleared the search bar";
      is_correction = true;
      break;
    case EVENT_TYPES.SEARCH_SUBMIT:
      description = `Searched for "${snap}"`;
      if (snap && snap.toLowerCase() !== scenario.expectedSearchTerm.toLowerCase()) {
        is_mistake = true;
        description += ` (expected "${scenario.expectedSearchTerm}")`;
      }
      break;
    case EVENT_TYPES.PRODUCT_CLICK:
      description = `Clicked product "${snap}"`;
      if (snap !== scenario.expectedProductSlug) {
        is_mistake = true;
        description += ` (expected "${scenario.expectedProductSlug}")`;
      }
      break;
    case EVENT_TYPES.COLOR_SELECT:
      description = `Selected color: ${snap}`;
      if (snap !== scenario.expectedColor) {
        is_mistake = true;
        description += ` (expected ${scenario.expectedColor})`;
      }
      break;
    case EVENT_TYPES.SIZE_SELECT:
      description = `Selected size: ${snap}`;
      if (snap !== scenario.expectedSize) {
        is_mistake = true;
        description += ` (expected ${scenario.expectedSize})`;
      }
      break;
    case EVENT_TYPES.QUANTITY_INCREMENT:
      description = `Incremented quantity to ${snap}`;
      break;
    case EVENT_TYPES.QUANTITY_DECREMENT:
      description = `Decremented quantity to ${snap}`;
      break;
    case EVENT_TYPES.QUANTITY_INPUT:
      description = `Set quantity to ${snap}`;
      break;
    case EVENT_TYPES.ADD_TO_CART_CLICK:
      description = "Added item to cart";
      break;
    case EVENT_TYPES.CART_ICON_CLICK:
      description = "Clicked cart icon";
      break;
    case EVENT_TYPES.CART_PAGE_OPEN:
      description = "Opened cart page";
      break;
    case EVENT_TYPES.ADDRESS_FIELD_FOCUS:
      description = `Focused address field: ${event.field_name}`;
      break;
    case EVENT_TYPES.ADDRESS_FIELD_INPUT:
      description = `Typing in ${event.field_name}: "${snap}"`;
      break;
    case EVENT_TYPES.ADDRESS_FIELD_BLUR:
      description = `Completed address field ${event.field_name}: "${snap}"`;
      break;
    case EVENT_TYPES.ADDRESS_FIELD_CLEAR:
      description = `Cleared address field: ${event.field_name}`;
      is_correction = true;
      break;
    case EVENT_TYPES.SHIPPING_METHOD_SELECT:
      description = `Selected shipping: ${snap}`;
      if (snap !== scenario.expectedShippingMethod) {
        is_mistake = true;
        description += ` (expected ${scenario.expectedShippingMethod})`;
      }
      break;
    case EVENT_TYPES.PAYMENT_METHOD_SELECT:
      description = `Selected payment: ${snap}`;
      if (snap !== scenario.expectedPaymentMethod) {
        is_mistake = true;
        description += ` (expected ${scenario.expectedPaymentMethod})`;
      }
      break;
    case EVENT_TYPES.CONTINUE_TO_PAYMENT_CLICK:
      description = "Clicked Continue to Payment";
      break;
    case EVENT_TYPES.CARD_FIELD_FOCUS:
      description = `Focused card field: ${event.field_name}`;
      break;
    case EVENT_TYPES.CARD_FIELD_INPUT:
      description = `Typing in ${event.field_name}: "${snap}"`;
      break;
    case EVENT_TYPES.CARD_FIELD_BLUR:
      description = `Completed card field ${event.field_name}: "${snap}"`;
      break;
    case EVENT_TYPES.CARD_FIELD_CLEAR:
      description = `Cleared card field: ${event.field_name}`;
      is_correction = true;
      break;
    case EVENT_TYPES.CARD_FIELD_SELECT:
      description = `Selected ${event.field_name}: ${snap}`;
      break;
    case EVENT_TYPES.TERMS_CHECK:
      description = "Checked Terms and Conditions";
      break;
    case EVENT_TYPES.TERMS_UNCHECK:
      description = "Unchecked Terms and Conditions";
      is_correction = true;
      break;
    case EVENT_TYPES.PAY_NOW_CLICK:
      description = "Clicked Pay Now";
      break;
    default:
      description = `${event.event_type}${snap ? `: ${snap}` : ""}`;
  }

  return { description, is_mistake, is_correction };
}

export function buildEventNarrative(
  events: FullShopFieldEvent[],
  scenario: FullShopScenarioConfig
): EventNarrative[] {
  if (events.length === 0) return [];

  const startTime = new Date(events[0].event_timestamp).getTime();

  return events.map((event) => {
    const eventTime = new Date(event.event_timestamp).getTime();
    const relativeMs = eventTime - startTime;
    const { description, is_mistake, is_correction } = describeEvent(event, scenario);

    return {
      timestamp_ms: relativeMs,
      timestamp_display: formatRelativeTime(relativeMs),
      stage: event.stage,
      event_type: event.event_type,
      description,
      is_correction,
      is_mistake,
    };
  });
}
