export const AGENT_TEST_ID_PREFIX = "at_";

export const AGENT_TEST_FIELDS = [
  "cardholderName",
  "cardNumber",
  "expiryMonth",
  "expiryYear",
  "cvv",
  "billingZip",
] as const;

export type AgentTestFieldName = (typeof AGENT_TEST_FIELDS)[number];

export const FIELD_TESTID_MAP: Record<string, AgentTestFieldName> = {
  "input-test-cardholder-name": "cardholderName",
  "input-test-card-number": "cardNumber",
  "select-test-expiry-month": "expiryMonth",
  "select-test-expiry-year": "expiryYear",
  "input-test-card-cvv": "cvv",
  "input-test-billing-zip": "billingZip",
};

export const DEFAULT_TOTAL_FIELDS = 6;

export const SCORING_WEIGHTS = {
  accuracy: 40,
  completion: 30,
  speed: 15,
  efficiency: 15,
} as const;

export const SPEED_BENCHMARKS = [
  { maxSeconds: 30, score: 100 },
  { maxSeconds: 60, score: 80 },
  { maxSeconds: 120, score: 60 },
  { maxSeconds: 180, score: 40 },
  { maxSeconds: Infinity, score: 20 },
] as const;

export const GRADE_THRESHOLDS = [
  { min: 90, grade: "A" },
  { min: 80, grade: "B" },
  { min: 70, grade: "C" },
  { min: 60, grade: "D" },
  { min: 0, grade: "F" },
] as const;

export const HESITATION_GAP_MS = 15_000;

export const EVENT_BATCH_INTERVAL_MS = 3_000;
export const INPUT_DEBOUNCE_MS = 300;
export const MAX_EVENTS_PER_TEST = 500;
