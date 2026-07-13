export interface AgentPlatform {
  id: string;
  label: string;
  onboardingLabel: string;
}

export const AGENT_PLATFORMS: AgentPlatform[] = [
  { id: "claude_code", label: "Claude Code", onboardingLabel: "Claude Code" },
  { id: "claude_cowork", label: "Claude CoWork", onboardingLabel: "Claude CoWork" },
  { id: "codex", label: "Codex", onboardingLabel: "Codex" },
  { id: "openclaw", label: "OpenClaw", onboardingLabel: "OpenClaw" },
  { id: "hermes", label: "Hermes Agent", onboardingLabel: "Hermes Agent" },
  { id: "agent", label: "Other Agent", onboardingLabel: "All Other Agents" },
  { id: "application", label: "Application", onboardingLabel: "Building an Application" },
];

export function agentPlatformLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  const known = AGENT_PLATFORMS.find((p) => p.id === value);
  return known ? known.label : value;
}
