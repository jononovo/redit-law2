import type { AgentTestFieldName } from "./constants";

export interface ExpectedValues {
  cardholderName: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvv: string;
  billingZip: string;
}

export interface SubmittedValues {
  cardholderName: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvv: string;
  billingZip: string;
}

export interface AccuracyScore {
  score: number;
  weight: number;
  correct: number;
  total: number;
  mismatches: string[];
}

export interface CompletionScore {
  score: number;
  weight: number;
  fields_filled: number;
  total_fields: number;
  submitted: boolean;
}

export interface SpeedScore {
  score: number;
  weight: number;
  total_seconds: number;
  benchmark: string;
}

export interface EfficiencyScore {
  score: number;
  weight: number;
  total_events: number;
  avg_events_per_field: number;
  retypes: number;
  refocuses: number;
}

export interface FieldBreakdown {
  field_name: string;
  expected_length: number;
  submitted_length: number;
  accurate: boolean;
  filled: boolean;
  time_to_fill_ms: number;
  interaction_count: number;
  retypes: number;
  refocuses: number;
  notes: string[];
}

export interface TimelineGap {
  after_field: string;
  before_field: string;
  gap_ms: number;
  note: string;
}

export interface ApprovalInfo {
  required: boolean;
  requested_at?: string;
  approved_at?: string;
  wait_seconds?: number;
  auto_approved?: boolean;
}

export interface TestReport {
  test_id: string;
  checkout_type: string;
  overall_score: number;
  grade: string;
  summary: string;
  scores: {
    accuracy: AccuracyScore;
    completion: CompletionScore;
    speed: SpeedScore;
    efficiency: EfficiencyScore;
  };
  field_breakdown: FieldBreakdown[];
  timeline: {
    page_load_to_first_interaction_ms: number;
    first_interaction_to_submit_ms: number;
    gaps: TimelineGap[];
  };
  approval: ApprovalInfo;
  flags: string[];
}

export interface FieldEventInput {
  event_type: string;
  field_name: AgentTestFieldName | null;
  value_length: number;
  sequence_num: number;
  event_timestamp: string;
}

export interface CreateTestInput {
  expected_values?: Partial<ExpectedValues>;
  checkout_type?: string;
  owner_uid?: string | null;
  card_id?: string | null;
  card_test_token?: string | null;
  bot_id?: string | null;
  approval_required?: boolean;
}

export interface CreateTestResponse {
  test_id: string;
  test_url: string;
  expected_values: ExpectedValues;
  instructions: string;
  expires_at: string;
}
