export interface StepResult {
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  details?: Record<string, unknown>;
}

export interface AgentTestResult {
  model: string;
  scenario: string;
  passed: boolean;
  steps: StepResult[];
  totalDurationMs: number;
  timestamp: string;
  error?: string;
}

export interface SkillJson {
  name: string;
  version: string;
  description: string;
  credentials?: {
    type: string;
    header?: string;
  };
  openclaw?: {
    install_url?: string;
    skill_md?: string;
  };
  api_base?: string;
  [key: string]: unknown;
}

export interface SkillMdFrontmatter {
  name?: string;
  version?: string;
  api_base?: string;
  [key: string]: unknown;
}

export interface RegistrationResponse {
  bot_id: string;
  api_key: string;
  claim_token: string;
  claim_url?: string;
}

export interface BotStatusResponse {
  bot_id: string;
  status: string;
  wallet_status: string;
  [key: string]: unknown;
}
