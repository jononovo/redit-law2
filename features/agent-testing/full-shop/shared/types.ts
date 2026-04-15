export interface ShopProduct {
  slug: string;
  name: string;
  category: "sneakers" | "hoodie" | "backpack";
  searchTerm: string;
  price: number;
  colors: string[];
  sizes: string[];
  description: string;
}

export interface CartItem {
  productSlug: string;
  productName: string;
  color: string;
  size: string;
  quantity: number;
  unitPrice: number;
}

export interface ShippingAddress {
  fullName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface CardDetails {
  cardholderName: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvv: string;
  billingZip: string;
}

export interface FullShopScenarioConfig {
  scenarioId: string;

  expectedSearchTerm: string;
  expectedProductSlug: string;
  expectedProductName: string;
  expectedColor: string;
  expectedSize: string;
  expectedQuantity: number;
  expectedShippingMethod: "standard" | "priority";
  expectedPaymentMethod: "credit_card";

  expectedShippingAddress: ShippingAddress;
  expectedCardDetails: CardDetails;
}

export interface PolledEvent {
  event_type: string;
  field_name: string | null;
  value_snapshot: string | null;
  value_length: number;
  sequence_num: number;
  stage: string | null;
  event_timestamp: string;
}

export interface FullShopFieldEvent {
  stage: string;
  event_type: string;
  field_name: string | null;
  value_snapshot: string | null;
  value_length: number;
  sequence_num: number;
  event_timestamp: string;
}

export interface DerivedStageGate {
  stage: string;
  stageNumber: number;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number;
  finalValues: Record<string, string>;
  expectedValues: Record<string, string>;
  fieldMatches: Record<string, FieldMatchResult>;
  stagePassed: boolean;
  corrections: number;
  correctionDetails: CorrectionDetail[];
  eventCount: number;
}

export interface FieldMatchResult {
  expected: string;
  actual: string;
  match: boolean;
  timestamp: string | null;
}

export interface CorrectionDetail {
  field: string;
  firstAttempt: string;
  finalValue: string;
  attempts: number;
}

export interface DecisionAudit {
  instruction: string;
  expected: string;
  actual: string | null;
  match: boolean;
  stage: string;
  first_attempt: string | null;
  attempts: number;
}

export interface EventNarrative {
  timestamp_ms: number;
  timestamp_display: string;
  stage: string;
  event_type: string;
  description: string;
  is_correction: boolean;
  is_mistake: boolean;
}

export interface FieldMismatch {
  field: string;
  expected: string;
  actual: string;
}

export interface TimelineGap {
  after_stage: string;
  before_stage: string;
  gap_ms: number;
  note: string;
}

export interface FullShopTestReport {
  test_id: string;
  test_type: "full_shop";
  scenario_id: string;
  overall_score: number;
  grade: string;
  summary: string;

  scores: {
    instructionFollowing: {
      score: number;
      weight: 35;
      decisions: DecisionAudit[];
    };
    dataAccuracy: {
      score: number;
      weight: 25;
      matchingFields: number;
      totalFields: number;
      mismatches: FieldMismatch[];
    };
    flowCompletion: {
      score: number;
      weight: 20;
      stagesCompleted: number;
      totalStages: 8;
      termsChecked: boolean;
    };
    speed: {
      score: number;
      weight: 10;
      totalSeconds: number;
      benchmark: string;
    };
    navigationEfficiency: {
      score: number;
      weight: 10;
      backtracks: number;
      wrongClicks: number;
      corrections: number;
    };
  };

  stage_breakdown: DerivedStageGate[];
  decision_audit: DecisionAudit[];
  event_narrative: EventNarrative[];
  raw_event_count: number;

  timeline: {
    total_duration_ms: number;
    per_stage_duration_ms: Record<string, number>;
    gaps: TimelineGap[];
    wasted_time_ms: number;
  };
  flags: string[];
}

export interface ShopState {
  searchQuery: string;
  selectedProductSlug: string | null;
  selectedColor: string | null;
  selectedSize: string | null;
  quantity: number;
  address: {
    fullName: string;
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  shippingMethod: string | null;
  paymentMethod: string | null;
  card: {
    cardholderName: string;
    cardNumber: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    billingZip: string;
  };
  termsChecked: boolean;
}

export interface StageSnapshot {
  search?: string;
  product?: string;
  color?: string;
  size?: string;
  quantity?: number;
  shippingMethod?: string;
  paymentMethod?: string;
  address?: Partial<ShippingAddress>;
  card?: Partial<CardDetails>;
  termsChecked?: boolean;
}

export interface TestStatusResponse {
  status: string;
  currentStage: string | null;
  currentPage: string | null;
  stagesCompleted: number;
  eventCount: number;
  lastSeqNum: number;
  stageSnapshot: StageSnapshot;
}

export function createEmptyShopState(): ShopState {
  return {
    searchQuery: "",
    selectedProductSlug: null,
    selectedColor: null,
    selectedSize: null,
    quantity: 1,
    address: { fullName: "", street: "", city: "", state: "", zip: "" },
    shippingMethod: null,
    paymentMethod: null,
    card: {
      cardholderName: "",
      cardNumber: "",
      expiryMonth: "",
      expiryYear: "",
      cvv: "",
      billingZip: "",
    },
    termsChecked: false,
  };
}
