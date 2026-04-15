export const FULL_SHOP_STAGES = [
  "page_arrival",
  "search",
  "product_select",
  "variant_config",
  "add_to_cart",
  "cart_review",
  "checkout_options",
  "payment",
] as const;

export type FullShopStage = (typeof FULL_SHOP_STAGES)[number];

export const STAGE_NUMBERS: Record<FullShopStage, number> = {
  page_arrival: 0,
  search: 1,
  product_select: 2,
  variant_config: 3,
  add_to_cart: 4,
  cart_review: 5,
  checkout_options: 6,
  payment: 7,
};

export const STAGE_LABELS: Record<FullShopStage, string> = {
  page_arrival: "Landing",
  search: "Search",
  product_select: "Product",
  variant_config: "Variant",
  add_to_cart: "Add to Cart",
  cart_review: "Cart",
  checkout_options: "Checkout",
  payment: "Payment",
};

export const EVENT_TYPES = {
  PAGE_LOAD: "page_load",
  PAGE_NAVIGATE: "page_navigate",
  PAGE_BACK: "page_back",
  SHOP_LANDING: "shop_landing",
  SEARCH_FOCUS: "search_focus",
  SEARCH_INPUT: "search_input",
  SEARCH_CLEAR: "search_clear",
  SEARCH_SUBMIT: "search_submit",
  PRODUCT_CLICK: "product_click",
  COLOR_SELECT: "color_select",
  SIZE_SELECT: "size_select",
  QUANTITY_INCREMENT: "quantity_increment",
  QUANTITY_DECREMENT: "quantity_decrement",
  QUANTITY_INPUT: "quantity_input",
  ADD_TO_CART_CLICK: "add_to_cart_click",
  CART_ICON_CLICK: "cart_icon_click",
  CART_PAGE_OPEN: "cart_page_open",
  ADDRESS_FIELD_FOCUS: "address_field_focus",
  ADDRESS_FIELD_INPUT: "address_field_input",
  ADDRESS_FIELD_BLUR: "address_field_blur",
  ADDRESS_FIELD_CLEAR: "address_field_clear",
  SHIPPING_METHOD_SELECT: "shipping_method_select",
  PAYMENT_METHOD_SELECT: "payment_method_select",
  CONTINUE_TO_PAYMENT_CLICK: "continue_to_payment_click",
  CARD_FIELD_FOCUS: "card_field_focus",
  CARD_FIELD_INPUT: "card_field_input",
  CARD_FIELD_BLUR: "card_field_blur",
  CARD_FIELD_CLEAR: "card_field_clear",
  CARD_FIELD_SELECT: "card_field_select",
  TERMS_CHECK: "terms_check",
  TERMS_UNCHECK: "terms_uncheck",
  PAY_NOW_CLICK: "pay_now_click",
} as const;

export const STAGE_DECISION_FIELDS: Record<string, string[]> = {
  search: ["searchQuery"],
  product_select: ["product"],
  variant_config: ["color", "size", "quantity"],
  checkout_options: [
    "fullName",
    "street",
    "city",
    "state",
    "zip",
    "shippingMethod",
    "paymentMethod",
  ],
  payment: [
    "cardholderName",
    "cardNumber",
    "expiryMonth",
    "expiryYear",
    "cvv",
    "billingZip",
    "termsChecked",
  ],
};

export const FULL_SHOP_SCORING_WEIGHTS = {
  instructionFollowing: 35,
  dataAccuracy: 25,
  flowCompletion: 20,
  speed: 10,
  navigationEfficiency: 10,
} as const;

export const FULL_SHOP_SPEED_BENCHMARKS = [
  { maxSeconds: 90, score: 100, label: "Excellent" },
  { maxSeconds: 180, score: 85, label: "Good" },
  { maxSeconds: 300, score: 70, label: "Average" },
  { maxSeconds: 600, score: 50, label: "Slow" },
  { maxSeconds: Infinity, score: 25, label: "Very Slow" },
] as const;

export const FULL_SHOP_GRADE_THRESHOLDS = [
  { min: 90, grade: "A" },
  { min: 80, grade: "B" },
  { min: 70, grade: "C" },
  { min: 60, grade: "D" },
  { min: 0, grade: "F" },
] as const;

export const TAX_RATE = 0.0825;
export const PRIORITY_SHIPPING_COST = 1299;
export const STANDARD_SHIPPING_COST = 0;

export const MAX_FULL_SHOP_EVENTS = 1000;
export const FULL_SHOP_EVENT_BATCH_INTERVAL_MS = 2_000;
export const FULL_SHOP_INPUT_DEBOUNCE_MS = 150;
export const OBSERVER_POLL_INTERVAL_FAST_MS = 500;
export const OBSERVER_POLL_INTERVAL_SLOW_MS = 2000;
export const OBSERVER_IDLE_THRESHOLD = 3;

export const STAGE_PAGE_MAP: Record<string, string> = {
  page_arrival: "",
  search: "search",
  product_select: "product",
  variant_config: "product",
  add_to_cart: "product",
  cart_review: "cart",
  checkout_options: "checkout",
  payment: "payment",
};
