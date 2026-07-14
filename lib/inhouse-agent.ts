// The in-house agent — one per owner, auto-provisioned, runs Agent Checkouts.
// Display name is deliberately a single constant: it may need to change before
// public launch (trademark), and the route/discriminator must not depend on it.
// See project_knowledge/internal_docs/04-payment-tools/agent-checkouts-inhouse-agent.md

export const INHOUSE_AGENT_NAME = "Captain Crunch";
export const INHOUSE_BOT_TYPE = "inhouse";
export const INHOUSE_AGENT_ROUTE = "/inhouse-agent";
export const INHOUSE_AGENT_DESCRIPTION =
  "CreditClaw's in-house agent. Give it a product link and it buys it with one of your virtual cards — you watch it work and stay in the loop.";
